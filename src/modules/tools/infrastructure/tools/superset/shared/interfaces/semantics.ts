export interface ISemantics {
  [key: string]: {
    business_hint: string;
    aliases: string[];
    values?: {
      [key: string]: {
        business_hint: string;
        aliases: string[];
      };
    };
  };
}
