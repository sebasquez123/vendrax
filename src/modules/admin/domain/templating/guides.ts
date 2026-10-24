import { LanguageTranslator } from '~/shared/services/i18n/config';

export interface GuideSection {
  title: string;
  items: string[];
}

export interface Guide {
  reference: string;
  sections: GuideSection[];
}

export const TGuides = (i18n: LanguageTranslator): Record<string, Guide> => {
  return {
    superset: {
      reference: 'superset',
      sections: [
        {
          title: i18n.t('common.guides.how_to_use'),
          items: [
            i18n.t('superset.guides.how_to_use.ask_simply'),
            i18n.t('superset.guides.how_to_use.name_the_chart'),
            i18n.t('superset.guides.how_to_use.modes'),
          ],
        },
        {
          title: i18n.t('common.guides.keep_in_mind'),
          items: [
            i18n.t('superset.guides.keep_in_mind.your_data'),
            i18n.t('superset.guides.keep_in_mind.can_be_wrong'),
            i18n.t('superset.guides.keep_in_mind.no_memory'),
          ],
        },
      ],
    },
    pay: {
      reference: 'pay',
      sections: [
        {
          title: i18n.t('common.guides.how_to_use'),
          items: [i18n.t('pay.guides.how_to_use.ask_how'), i18n.t('pay.guides.how_to_use.find_person')],
        },
        {
          title: i18n.t('common.guides.keep_in_mind'),
          items: [
            i18n.t('pay.guides.keep_in_mind.only_informs'),
            i18n.t('pay.guides.keep_in_mind.no_secrets'),
            i18n.t('pay.guides.keep_in_mind.can_be_wrong'),
            i18n.t('pay.guides.keep_in_mind.no_memory'),
          ],
        },
      ],
    },
  };
};
