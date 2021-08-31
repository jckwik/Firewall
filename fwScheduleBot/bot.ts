import fs = require("fs");
const axios = require("axios").default;

class FirewallBot {
  private static _instance: FirewallBot;
  private config: ScheduleBotConfig;

  constructor() {
    this.config = JSON.parse(
      fs.readFileSync("./fwScheduleconfig.json", "utf8")
    );
    this.get_current_season_teams();
    this.get_all_events();
    this.get_all_players();
    console.log(this.config);
  }

  public static Instance() {
    return this._instance || (this._instance = new this());
  }

  private saveConfig() {
    fs.writeFileSync("./fwScheduleconfig.json", JSON.stringify(this.config));
  }

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
      
      const response = await axios.get(
        `https://firewallesports.com/wp-json/sportspress/v2/events?per_page=100&orderby=date&order=desc&offset=${event_loop_count}`
      );
      console.log(response);
      for (const event of response.data) {
        current_events.push(event);
      }

      total_event_number = response.headers["X-WP-Total"];
      event_loop_count += 100;
    }
    console.log(current_events);
  }

  async get_all_players() {
    var player_loop_count = 0;
    var total_player_number = 1;
    const current_players = [] as Player[];

    while (player_loop_count < total_player_number) {
      
      const response = await axios.get(
        `https://firewallesports.com/wp-json/sportspress/v2/players?per_page=100&orderby=date&order=desc&offset=${player_loop_count}`
      );
      console.log(response);
      for (const player of response.data) {
        current_players.push(player);
      }
      total_player_number = response.headers['x-wp-total'];
      player_loop_count += 100;
    }
    console.log(current_players);
  }
}

interface ScheduleBotConfig {
  Tier1ScheduleChannel: number;
  Tier2ScheduleChannel: number;
  Tier3ScheduleChannel: number;
  Tier4ScheduleChannel: number;
  Tier5ScheduleChannel: number;
  DailyScheduleChannel: number;
  Tier1SeasonId: number;
  Tier2SeasonId: number;
  Tier3SeasonId: number;
  Tier4SeasonId: number;
  Tier5SeasonId: number;
  CurrentSeason: number;
  CurrentWeek: number;
  CurrentTeams: Team[];
  CurrentEvents: FWEvent[];
  CurrentPlayers: Player[];
}

interface Team {
  id: number;
  name: string;
  roleid?: number;
}

interface FWEvent {
  id: string;
  date: Date;
  link: string;
  title: {
    rendered: string;
  };
  leagues: number[];
  seasons: number[];
  teams: number[];
  main_results: string[];
  outcome: string[];
  winner: number;
}

interface Player {}

export { FirewallBot, Team, FWEvent, Player };
