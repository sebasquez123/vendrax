declare module 'pino-roll' {
  interface PinoRollOptions {
    file: string;
    size?: string | number;
    frequency?: 'daily' | 'hourly' | number;
    extension?: string;
    symlink?: boolean;
    limit?: { count?: number; removeOtherLogFiles?: boolean };
    dateFormat?: string;
    mkdir?: boolean;
  }

  const roll: (options: PinoRollOptions) => Promise<NodeJS.WritableStream>;
  export default roll;
}
