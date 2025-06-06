declare module 'fit-file-parser' {
  export interface FitDataRecord {
    [key: string]: unknown;
    timestamp?: Date;
    position_lat?: number;
    position_long?: number;
    altitude?: number;
    heart_rate?: number;
    cadence?: number;
    distance?: number;
    speed?: number;
    power?: number;
    temperature?: number;
    elapsed_time?: number;
    moving_time?: number;
  }

  export interface FitData {
    activity?: {
      sport: string;
      sub_sport: string;
      [key: string]: unknown;
    };
    device_info?: Array<{
      timestamp: Date;
      manufacturer: string;
      product: string;
      [key: string]: unknown;
    }>;
    records?: FitDataRecord[];
    sessions?: Array<{
      start_time: Date;
      end_time: Date;
      total_distance: number;
      total_timer_time: number;
      total_ascent?: number;
      [key: string]: unknown;
    }>;
    laps?: Array<{
      start_time: Date;
      end_time: Date;
      total_distance: number;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  }

  export default class FitParser {
    constructor(options?: {
      force?: boolean;
      speedUnit?: string;
      lengthUnit?: string;
      temperatureUnit?: string;
      elapsedRecordField?: boolean;
      mode?: string;
    });

    // API basée sur les événements
    on(event: 'data', callback: (data: FitData) => void): void;
    on(event: 'error', callback: (error: Error) => void): void;

    // Méthode parse qui lance les événements
    parse(content: Buffer | ArrayBuffer): void;
  }
}
