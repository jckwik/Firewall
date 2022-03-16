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

export { FWEvent };