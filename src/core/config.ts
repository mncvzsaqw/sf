export const config = {
  features: {
    speech: {
      enable: true,
      mode: 'web_api', // 'web_api' or 'local'
      tts_enable: true,
    },
    vision: {
      enable: true,
    },
    web_search: {
      enable: true,
    },
  },
  behavior: {
    allow_internet_access: true,
  },
};

export type AppConfig = typeof config;
