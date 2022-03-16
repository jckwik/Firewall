import { Client, Message, MessageEmbed, TextChannel } from "discord.js";
import fs = require("fs");
const axios = require("axios").default;
import dateFormat = require("dateformat");
import { Team } from "./models/team";
import { FWEvent } from "./models/FWEvent";
import { Player } from "./models/player";

class FirewallBot {
  private static _instance: FirewallBot;
  public config: ScheduleBotConfig;
  static _client: Client;

  constructor() {
    this.config = {
      Tier1PlayerMax: 2700,
      Tier2PlayerMax: 3200,
      Tier3PlayerMax: 3700,
      Tier4PlayerMax: 4250,
      Tier5PlayerMax: 9999,
      Tier1TeamMax: 2550,
      Tier2TeamMax: 3000,
      Tier3TeamMax: 3550,
      Tier4TeamMax: 4000,
      Tier5TeamMax: 4250,
      Tier1ResultsChannel: "0",
      Tier2ResultsChannel: "0",
      Tier3ResultsChannel: "0",
      Tier4ResultsChannel: "0",
      Tier5ResultsChannel: "0",
      ListCache: [] as Team[],
      MaxWeeks: 11,
    };
    this.config = Object.assign(
      this.config,
      JSON.parse(fs.readFileSync("./fwScheduleconfig.json", "utf8"))
    );
    this.get_current_season_teams();
    this.get_all_events();
    this.get_all_players();
  }

  public static Instance(client?: Client) {
    if (!FirewallBot._instance) {
      this._instance = new FirewallBot();
    }
    if (client as Client) this._client = client;
    return this._instance || (this._instance = new this());
  }

  saveConfig = () => {
    fs.writeFileSync("./fwScheduleconfig.json", JSON.stringify(this.config));
  };

  async get_current_season_teams() {
    const url = `https://firewallesports.com/wp-json/sportspress/v2/teams?_fields=title,id&per_page=100&seasons=${this.config.CurrentSeason}`;
    try {
      const response = await axios.get(url);
      const teams = [{ id: 0, name: "Unknown or undefined team" }] as Team[];
      for (const team of response.data) {
        teams.push({ id: team.id, name: team.title.rendered });
      }

      this.config.CurrentTeams = teams;
      this.saveConfig();
    } catch (error) {
      console.log(error);
    }
  }

  async get_all_events() {
    var event_loop_count = 0;
    var total_event_number = 1;
    const current_events = [] as FWEvent[];

    while (event_loop_count < total_event_number) {
      try {
        const response = await axios.get(
          `https://firewallesports.com/wp-json/sportspress/v2/events?per_page=100&orderby=date&order=desc&offset=${event_loop_count}`
        );
        for (const event of response.data) {
          current_events.push(event);
        }

        total_event_number = response.headers["x-wp-total"];
        event_loop_count += 100;
      } catch (error) {
        console.log(error);
      }
    }
    this.config.CurrentEvents = current_events;
    this.saveConfig();
  }

  async get_all_players() {
    var player_loop_count = 0;
    var total_player_number = 1;
    const current_players = [] as Player[];

    while (player_loop_count < total_player_number) {
      try {
        const response = await axios.get(
          `https://firewallesports.com/wp-json/sportspress/v2/players?per_page=100&orderby=date&order=desc&offset=${player_loop_count}`
        );
        for (const player of response.data) {
          current_players.push(player);
        }
        total_player_number = response.headers["x-wp-total"];
        player_loop_count += 100;
      } catch (error) {
        console.log(error);
      }
    }
    this.config.CurrentPlayers = current_players;
    this.saveConfig();
  }

  async refresh_data() {
    await this.get_all_events();
    await this.get_all_players();
    await this.get_current_season_teams();
  }

  async get_player_list_by_id(id: number): Promise<Player[]> {
    const players = [];
    try {
      const response = await axios.get(
        `https://firewallesports.com/wp-json/sportspress/v2/lists/${id}`
      );
      for (const player of Object.values(response.data.data) as Player[]) {
        player.sr = Math.max(
          player.dpssr,
          player.dpssrs,
          player.tanksr,
          player.tanksrtwo,
          player.supportsr,
          player.supportsrtwo
        );
        if (Number.isInteger(player.sr)) players.push(player);
      }
      this.cache_list_name(id, response.data.title.rendered);
    } catch (error) {
      console.log(error);
    }
    return players;
  }

  async get_srs_from_player_list(list: Player[]): Promise<number[]> {
    const srs = [];
    for (const player of list) {
      const playersr = [
        player.dpssr,
        player.dpssrs,
        player.tanksr,
        player.tanksrtwo,
        player.supportsr,
        player.supportsrtwo,
      ] as number[];
      const sr = Math.max(...playersr);
      if (Number.isInteger(sr)) srs.push(sr);
    }
    return srs;
  }

  async get_team_sr_average(team_players: Player[]): Promise<number> {
    const team_srs = await this.get_srs_from_player_list(team_players);
    team_srs.sort((a, b) => b - a);
    while (team_srs.indexOf(0) !== -1) team_srs.splice(team_srs.indexOf(0));
    const team_srs_for_average = team_srs.slice(0, 7);
    const team_sr_average =
      team_srs_for_average.reduce((a, b) => a + b, 0) /
      team_srs_for_average.length;
    return team_sr_average;
  }

  get_tier_team_max_sr(tier: number) {
    return this.config[`Tier${tier}TeamMax`];
  }

  get_tier_player_max_sr(tier: number) {
    return this.config[`Tier${tier}PlayerMax`];
  }

  get_team_name_by_id(id: number) {
    const team =
      this.config.CurrentTeams.find((t) => t.id === id) ||
      this.config.ListCache.find((t) => t.id === id);
    return team ? team.name : "Unknown or undefined team";
  }

  cache_list_name(id: number, name: string) {
    if (!this.config.ListCache.find((t) => t.id === id)) {
      this.config.ListCache.push({ id: id, name: name });
      this.saveConfig();
    } else {
      this.config.ListCache.find((t) => t.id === id).name = name;
    }
  }

  async reportDayGames(newMessage: boolean = false) {
    if (!this.config.DailyScheduleChannel) {
      console.log("Daily schedule channel not set");
      return false;
    }

    const current_events = this.config.CurrentEvents;
    const day_games = current_events.filter((e) =>
      this.are_dates_same_day(e.date, new Date())
    );

    const day_sorted_games = day_games.sort((a, b) => {
      if (a.date < b.date) {
        return -1;
      }
      if (a.date > b.date) {
        return 1;
      }
      return 0;
    });

    const embed = new MessageEmbed()
      .setTitle(`Today's Games: ${new Date().toDateString()}`)
      .setTimestamp()
      .setFooter(`Firewall Season 5`);

    for (const game of day_sorted_games) {
      const game_embed = this.build_event_output_embed(game as FWEvent);
      embed.addField(game_embed.fields[0].name, game_embed.fields[0].value);
    }

    if (day_sorted_games.length === 0) {
      embed.addField("No games today", "No games today");
    }

    console.log(
      "Daily Schedule Channel Id: " + this.config.DailyScheduleChannel
    );
    const channel = FirewallBot._client.channels.cache.get(
      this.config.DailyScheduleChannel
    ) as TextChannel;
    if (!channel) {
      console.log("Channel not found");
      return false;
    }

    const message = (await this.editMessageOrCreate(
      channel,
      this.config.DailyScheduleMessage,
      embed
    )) as Message;

    if (message) {
      this.config.DailyScheduleMessage = message.id;
    } else return false;

    return true;
  }

  are_dates_same_day(date1: Date, date2: Date) {
    return dateFormat(date1, "yyyy-mm-dd") === dateFormat(date2, "yyyy-mm-dd");
  }

  build_event_output_embed = (event: FWEvent) => {
    const embed = new MessageEmbed();

    const teams = event.teams.map((t) => this.get_team_name_by_id(t));

    if (event.main_results.length === 0) {
      embed.addField(
        teams.join(" VS "),
        `${dateFormat(event.date, "dddd mmm dd':' h TT Z")}: ${teams.join(
          " VS "
        )}`
      );
    } else {
      this.buildEventScoreEmbed(event, embed);
    }
    return embed;
  };

  buildEventScoreEmbed(event: FWEvent, embed: MessageEmbed) {
    const teams = event.teams.map((t) => this.get_team_name_by_id(t));
    if (!event.winner) return;
    const winnerIndex = event.teams.indexOf(event.winner);
    //index is always 0 or 1, so we can check falsy values to see which score to put where
    if (winnerIndex) {
      embed.addField(
        teams.join(" VS "),
        `Winner: ${this.get_team_name_by_id(event.winner)}: ${
          event.main_results[1]
        } - ${event.main_results[0]}`
      );
    } else {
      embed.addField(
        teams.join(" VS "),
        `Winner: ${this.get_team_name_by_id(event.winner)}: ${
          event.main_results[0]
        } - ${event.main_results[1]}`
      );
    }
  }

  async reportWeekGames(
    tier: number,
    week: number,
    newMessage: boolean = false
  ) {
    const scheduleChannel = this.config[`Tier${tier}ScheduleChannel`];
    const resultsChannel = this.config[`Tier${tier}ResultsChannel`];
    const tierId = this.config[`Tier${tier}SeasonId`];

    if (!scheduleChannel) {
      console.warn(`Schedule channel tier ${tier} not set - failing`);
      return false;
    }
    if (!resultsChannel) {
      console.warn(`Results channel tier ${tier} not set - failing`);
      return false;
    }

    const current_events = this.config.CurrentEvents;

    const week_games = current_events.filter(
      (e) =>
        e.day === week.toString() && e.leagues.some((r) => tierId.includes(r))
    );

    const week_sorted_games = week_games.sort((a, b) => {
      if (a.date < b.date) {
        return -1;
      }
      if (a.date > b.date) {
        return 1;
      }
      return 0;
    });

    const scheduleEmbed = new MessageEmbed()
      .setTitle(`Week ${week} Games: Tier ${tier}`)
      .setTimestamp()
      .setFooter(`Firewall Season 5`);

    const resultEmbed = new MessageEmbed()
      .setTitle(`Week ${week} Results: Tier ${tier}`)
      .setTimestamp()
      .setFooter(`Firewall Season 5`);

    for (const game of week_sorted_games) {
      const game_embed = this.build_event_output_embed(game as FWEvent);
      scheduleEmbed.addField(
        game_embed.fields[0].name,
        game_embed.fields[0].value
      );
      if (game.winner) {
        this.buildEventScoreEmbed(game, resultEmbed);
      }
    }

    if (week_games.length === 0) {
      scheduleEmbed.addField("No games this week", "No games this week");
    }

    const channel = FirewallBot._client.channels.cache.get(
      scheduleChannel
    ) as TextChannel;
    if (!channel) {
      console.log("Schedule channel not found");
      return false;
    }

    const scheduleMessageConfigName = `Tier${tier}Week${week}ScheduleMessage`;
    let messageId = this.config[scheduleMessageConfigName];
    if (newMessage) messageId = undefined;
    const message = (await this.editMessageOrCreate(
      channel,
      messageId,
      scheduleEmbed
    )) as Message;

    if (message) {
      this.config[scheduleMessageConfigName] = message.id;
    } else return false;

    const resultChannel = FirewallBot._client.channels.cache.get(
      resultsChannel
    ) as TextChannel;
    if (!resultChannel) {
      console.log("Results channel not found");
      return false;
    }

    const resultMessageConfigName = `Tier${tier}Week${week}ResultsMessage`;
    messageId = this.config[resultMessageConfigName];
    if (newMessage) messageId = undefined;
    if (resultEmbed.fields.length > 0) {
      const resultMessage = (await this.editMessageOrCreate(
        resultChannel,
        messageId,
        resultEmbed
      )) as Message;

      if (resultMessage) {
        this.config[resultMessageConfigName] = resultMessage.id;
      } else return false;
    }

    const casterConfigName = `Tier${tier}Week${week}CasterScheduleMessage`;
    messageId = this.config[casterConfigName];
    if (newMessage) messageId = undefined;
    const casterChannel = FirewallBot._client.channels.cache.get(
      this.config[`CasterScheduleChannel`]
    ) as TextChannel;
    if (!casterChannel) {
      console.warn("Caster channel not found");
    } else {
      const casterMessage = (await this.editMessageOrCreate(
        casterChannel,
        messageId,
        scheduleEmbed
      )) as Message;

      if (casterMessage) {
        this.config[casterConfigName] = casterMessage.id;
      } else {
        console.warn(`Caster message not sent - Tier ${tier}`);
        return false;
      }
    }

    this.saveConfig();

    return true;
  }

  async editMessageOrCreate(
    channel: TextChannel,
    messageId: string,
    embed: MessageEmbed
  ) {
    if (!messageId) {
      console.log("Creating new message");
      try {
        const message = await channel.send({ embeds: [embed] });
        return message;
      } catch (error) {
        console.error(error);
        return false;
      }
    } else {
      const message = await channel.messages.fetch(messageId);
      try {
        await message.edit({ embeds: [embed] });
      } catch (error) {
        console.error(error);
        try {
          console.warn("Failed to find message - resending");
          const message = await channel.send({ embeds: [embed] });
          return message;
        } catch (error) {
          console.error(error);
          return false;
        }
      }
      return message;
    }
  }

  async reportAllWeekGames(currentWeek?: number, newMessage: boolean = false) {
    if (!currentWeek) {
      currentWeek = this.config.CurrentWeek;
    }

    for (let week = currentWeek; week > 0; week--) {
      for (let i = 1; i <= 5; i++) {
        try {
          await this.reportWeekGames(i, week, newMessage);
        } catch (error) {
          console.error(error.stack);
          return false;
        }
      }
    }
    if (currentWeek !== this.config.MaxWeeks) {
      for (let i = 1; i <= 5; i++) {
        try {
          await this.reportWeekGames(i, currentWeek + 1, newMessage);
        } catch (error) {
          console.error(error.stack);
          return false;
        }
      }
    }
    return true;
  }
}

interface ScheduleBotConfig extends Record<string, any> {
  Tier1ScheduleChannel?: string;
  Tier2ScheduleChannel?: string;
  Tier3ScheduleChannel?: string;
  Tier4ScheduleChannel?: string;
  Tier5ScheduleChannel?: string;
  DailyScheduleChannel?: string;
  DailyScheduleMessage?: string;
  CasterScheduleChannel?: string;
  Tier1ResultsChannel?: string;
  Tier2ResultsChannel?: string;
  Tier3ResultsChannel?: string;
  Tier4ResultsChannel?: string;
  Tier5ResultsChannel?: string;
  Tier1SeasonId?: number[];
  Tier2SeasonId?: number[];
  Tier3SeasonId?: number[];
  Tier4SeasonId?: number[];
  Tier5SeasonId?: number[];
  Tier1PlayerMax?: number;
  Tier2PlayerMax?: number;
  Tier3PlayerMax?: number;
  Tier4PlayerMax?: number;
  Tier5PlayerMax?: number;
  Tier1TeamMax?: number;
  Tier2TeamMax?: number;
  Tier3TeamMax?: number;
  Tier4TeamMax?: number;
  Tier5TeamMax?: number;
  CurrentSeason?: number;
  CurrentWeek?: number;
  MaxWeeks?: number;
  CurrentTeams?: Team[];
  CurrentEvents?: FWEvent[];
  CurrentPlayers?: Player[];
  ListCache?: Team[];
}

export { FirewallBot };
