import { Client, MessageEmbed, TextChannel } from "discord.js";
import fs = require("fs");
const axios = require("axios").default;

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
      ListCache: [] as Team[],
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
      //console.log(teams.find(t => t.id === 4419));
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

        total_event_number = response.headers["X-WP-Total"];
        event_loop_count += 100;
      } catch (error) {
        console.log(error);
      }
    }
    this.config.CurrentEvents = current_events;
    this.saveConfig();
    console.log(current_events);
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
    this.get_all_events();
    this.get_all_players();
    this.get_current_season_teams();
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

    //const current_events = this.config.CurrentEvents;
    const current_events = [
      {
        id: "1",
        title: { rendered: "Test Event" },
        date: new Date("2021-07-04T19:00:00"),
        teams: [4315, 4253],
        leagues: [10],
        day: "0",
      },
    ];
    const day_games = current_events.filter(
      (e) => e.date.toDateString() === new Date().toDateString()
    );

    const embed = new MessageEmbed()
      .setTitle(`Today's Games: ${new Date().toDateString()}`)
      .setTimestamp();

    for (const game of day_games) {
      const game_embed = this.build_event_output_embed(game as FWEvent);
      embed.addField(game_embed.fields[0].name, game_embed.fields[0].value);
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

    if (newMessage) {
      try {
        const message = await channel.send({ embeds: [embed] });
        this.config.DailyScheduleMessage = message.id;
        this.saveConfig();
      } catch (error) {
        console.log(error);
        return false;
      }
    } else {
      channel.messages
        .fetch(this.config.DailyScheduleMessage)
        .then((m) => {
          m.edit({ embeds: [embed] });
        })
        .catch(async (error) => {
          try {
            console.warn("Failed to find daily schedule message - resending");
            const message = await channel.send({ embeds: [embed] });
            this.config.DailyScheduleMessage = message.id;
          } catch (error) {
            console.log(error);
            return false;
          }
        });
      return true;
    }
  }

  build_event_output_embed = (event: FWEvent) => {
    const embed = new MessageEmbed();

    const teams = event.teams.map((t) => this.get_team_name_by_id(t));

    if (!event.winner) {
      embed.addField(
        teams.join(" VS "),
        `${event.date.toString()}: ${teams.join(" VS ")}`
      );
    } else {
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
    return embed;
  };

  async reportWeekGames(tier: number, newMessage: boolean = false) {
    const scheduleChannel = this.config[`Tier${tier}ScheduleChannel`];
    const tierId = this.config[`Tier${tier}SeasonId`];
    const current_week = this.config.CurrentWeek;
    if (!scheduleChannel) {
      console.warn(`Schedule channel tier ${tier} not set - failing`);
      return false;
    }

    //const current_events = this.config.CurrentEvents;
    const current_events = [
      {
        id: "1",
        title: { rendered: "Test Event" },
        date: new Date("2021-07-04T19:00:00"),
        leagues: [10],
        day: "0",
        teams: [3850, 4041],
        main_results: ["3", "2"],
        outcome: {
          "3850": "win",
          "4041": "loss",
        },
        winner: 3850,
      },
      {
        id: "2",
        title: { rendered: "Test Event 2" },
        date: new Date("2021-09-02T19:00:00"),
        teams: [4322, 4043],
        leagues: [9],
        day: "1",
        main_results: [],
        winner: null,
      },
    ];
    const week_games = current_events.filter(
      (e) => e.day === current_week.toString() && e.leagues.includes(tierId)
    );

    const embed = new MessageEmbed()
      .setTitle(`Week ${current_week} Games`)
      .setTimestamp();

    for (const game of week_games) {
      const game_embed = this.build_event_output_embed(game as FWEvent);
      embed.addField(game_embed.fields[0].name, game_embed.fields[0].value);
    }

    if (week_games.length === 0) {
      embed.addField("No games this week", "No games this week");
    }

    console.log(`Tier ${tier} Schedule Channel Id: ` + scheduleChannel);
    const channel = FirewallBot._client.channels.cache.get(
      scheduleChannel
    ) as TextChannel;
    if (!channel) {
      console.log("Channel not found");
      return false;
    }

    const messageId =
      this.config[`Tier${tier}Week${current_week}ScheduleMessage`];
    if (newMessage) {
      try {
        const message = await channel.send({ embeds: [embed] });
        this.config[`Tier${tier}Week${current_week}ScheduleMessage`] =
          message.id;
        this.saveConfig();
      } catch (error) {
        console.error(error);
        return false;
      }
    } else {
      channel.messages
        .fetch(messageId)
        .then((m) => {
          m.edit({ embeds: [embed] });
        })
        .catch(async (error) => {
          try {
            console.warn("Failed to find daily schedule message - resending");
            const message = await channel.send({ embeds: [embed] });
            this.config[`Tier${tier}Week${current_week}ScheduleMessage`] =
              message.id;
          } catch (error) {
            console.error(error);
            return false;
          }
        });
      return true;
    }
  }

  async reportAllWeekGames(currentWeek?: number, newMessage: boolean = false) {
    if (!currentWeek) {
      currentWeek = this.config.CurrentWeek;
      this.saveConfig();
    }
    for (let i = 1; i <= 5; i++) {
      await this.reportWeekGames(i, newMessage);
    }
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
  Tier1SeasonId?: number;
  Tier2SeasonId?: number;
  Tier3SeasonId?: number;
  Tier4SeasonId?: number;
  Tier5SeasonId?: number;
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
  CurrentTeams?: Team[];
  CurrentEvents?: FWEvent[];
  CurrentPlayers?: Player[];
  ListCache?: Team[];
}

interface Team {
  id: number;
  name: string;
  roleid?: number;
}

interface FWEvent extends Record<string, any> {
  id: string;
  date: Date;
  link?: string;
  title: {
    rendered: string;
  };
  leagues?: number[];
  seasons?: number[];
  teams: number[];
  main_results: string[];
  outcome: string[];
  winner: number;
  day: string;
}

interface Player {
  dpssr?: number;
  dpssrs?: number;
  tanksr?: number;
  tanksrtwo?: number;
  supportsr?: number;
  supportsrtwo?: number;
  sr?: number;
  id?: number;
  name?: string;
}

export { FirewallBot, Team, FWEvent, Player };
