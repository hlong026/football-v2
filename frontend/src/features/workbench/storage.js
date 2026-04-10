import { defaultApiEndpoint, defaultAsianCompanies, defaultEuropeanCompanies, defaultMaxTokens, defaultModelName, defaultPromptName, defaultSite, defaultTemperature, } from './constants';
export function defaultRecordMarkState() {
    return {
        pinned: false,
        favorited: false,
        important: false,
    };
}
export function normalizeRecordMarkState(value) {
    if (!value || typeof value !== 'object') {
        return defaultRecordMarkState();
    }
    const input = value;
    return {
        pinned: Boolean(input.pinned),
        favorited: Boolean(input.favorited),
        important: Boolean(input.important),
    };
}
export function loadStoredRecordMarks(storageKey) {
    if (typeof window === 'undefined') {
        return {};
    }
    try {
        const raw = window.localStorage.getItem(storageKey);
        if (!raw) {
            return {};
        }
        const parsed = JSON.parse(raw);
        return Object.fromEntries(Object.entries(parsed).map(([key, value]) => [key, normalizeRecordMarkState(value)]));
    }
    catch {
        return {};
    }
}
export function persistRecordMarks(storageKey, recordMarks) {
    if (typeof window === 'undefined') {
        return;
    }
    window.localStorage.setItem(storageKey, JSON.stringify(recordMarks));
}
export function defaultRecordCustomization() {
    return {
        title: '',
        note: '',
        tags: '',
    };
}
export function normalizeRecordCustomization(value) {
    if (!value || typeof value !== 'object') {
        return defaultRecordCustomization();
    }
    const input = value;
    return {
        title: normalizeDraftString(input.title),
        note: normalizeDraftString(input.note),
        tags: normalizeDraftString(input.tags),
    };
}
export function loadStoredRecordCustomizations(storageKey) {
    if (typeof window === 'undefined') {
        return {};
    }
    try {
        const raw = window.localStorage.getItem(storageKey);
        if (!raw) {
            return {};
        }
        const parsed = JSON.parse(raw);
        return Object.fromEntries(Object.entries(parsed).map(([key, value]) => [key, normalizeRecordCustomization(value)]));
    }
    catch {
        return {};
    }
}
export function persistRecordCustomizations(storageKey, recordCustomizations) {
    if (typeof window === 'undefined') {
        return;
    }
    window.localStorage.setItem(storageKey, JSON.stringify(recordCustomizations));
}
export function normalizeDraftString(value, fallback = '') {
    return typeof value === 'string' ? value : fallback;
}
export function normalizeOptionalNumericInput(value) {
    return String(value ?? '').trim();
}
function normalizeDraftTemperature(value) {
    const normalized = normalizeDraftString(value);
    if (!normalized || normalized === '0.2') {
        return defaultTemperature;
    }
    return normalized;
}
function normalizeDraftMaxTokens(value) {
    const normalized = normalizeDraftString(value);
    if (!normalized || normalized === '4000') {
        return defaultMaxTokens;
    }
    return normalized;
}
export function loadStoredFormDraft(storageKey, resultTabs) {
    if (typeof window === 'undefined') {
        return {};
    }
    try {
        const raw = window.localStorage.getItem(storageKey);
        if (!raw) {
            return {};
        }
        const parsed = JSON.parse(raw);
        return {
            site: normalizeDraftString(parsed.site, defaultSite),
            matchUrl: normalizeDraftString(parsed.matchUrl),
            anchorStartTime: normalizeDraftString(parsed.anchorStartTime),
            anchorEndTime: normalizeDraftString(parsed.anchorEndTime),
            aiProvider: parsed.aiProvider === 'openai' ? 'openai' : 'deepseek',
            apiEndpoint: normalizeDraftString(parsed.apiEndpoint, defaultApiEndpoint),
            apiKey: normalizeDraftString(parsed.apiKey),
            modelName: normalizeDraftString(parsed.modelName, defaultModelName),
            temperature: normalizeDraftTemperature(parsed.temperature),
            maxTokens: normalizeDraftMaxTokens(parsed.maxTokens),
            promptText: normalizeDraftString(parsed.promptText),
            promptName: normalizeDraftString(parsed.promptName, defaultPromptName),
            europeanCompanies: normalizeDraftString(parsed.europeanCompanies, defaultEuropeanCompanies),
            asianCompanies: normalizeDraftString(parsed.asianCompanies, defaultAsianCompanies),
            fetchCookie: normalizeDraftString(parsed.fetchCookie),
            activeResultTab: parsed.activeResultTab && parsed.activeResultTab in resultTabs ? parsed.activeResultTab : 'analysis',
        };
    }
    catch {
        return {};
    }
}
export function persistFormDraft(storageKey, draft) {
    if (typeof window === 'undefined') {
        return;
    }
    window.localStorage.setItem(storageKey, JSON.stringify(draft));
}
