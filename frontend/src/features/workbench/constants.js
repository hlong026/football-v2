export const backendBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8010/api';
export const recordMarksStorageKey = 'football-analysis-v2-record-marks';
export const recordCustomStorageKey = 'football-analysis-v2-record-customizations';
export const formDraftStorageKey = 'football-analysis-v2-form-draft';
export const sampleMatchUrl = 'https://www.okooo.com/soccer/match/1234567/odds/';
export const expectedEuropeanTargetCount = 14;
export const expectedAsianTargetCount = 7;
export const defaultTemperature = '0.1';
export const defaultMaxTokens = '25600';
export const defaultApiEndpoint = 'https://api.deepseek.com/v1';
export const defaultModelName = 'deepseek-chat';
export const defaultPromptName = 'default';
export const defaultSite = 'okooo';
export const defaultEuropeanCompanies = '澳门,William Hill,Ladbrokes,bwin,Coral,SNAI,Bet365,Interwetten,Pinnacle,betvictor,Easybet,Crown,金宝博,bet-at-home';
export const defaultAsianCompanies = '澳门,Bet365,betvictor,Easybet,Crown,金宝博,Pinnacle';
export const resultTabLabels = {
    structured: '结构化结果',
    preview: '分析预览',
    analysis: '正式分析',
    history: '历史记录',
};
