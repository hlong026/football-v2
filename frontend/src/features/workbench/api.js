import { backendBaseUrl } from './constants';
import { normalizeOptionalNumericInput } from './storage';
import { splitCompanies, splitCookies } from './utils';
export function buildPayload(input) {
    const normalizedTemperature = normalizeOptionalNumericInput(input.temperature);
    const normalizedMaxTokens = normalizeOptionalNumericInput(input.maxTokens);
    const normalizedTopP = normalizeOptionalNumericInput(input.topP);
    const normalizedPresencePenalty = normalizeOptionalNumericInput(input.presencePenalty);
    const normalizedFrequencyPenalty = normalizeOptionalNumericInput(input.frequencyPenalty);
    const normalizedTimeoutSeconds = normalizeOptionalNumericInput(input.timeoutSeconds);
    const cookieItems = splitCookies(input.fetchCookie);
    return {
        site: input.site.trim(),
        match_url: input.matchUrl.trim(),
        anchor_start_time: new Date(input.anchorStartTime).toISOString(),
        anchor_end_time: input.anchorEndTime ? new Date(input.anchorEndTime).toISOString() : null,
        bookmaker_selection: {
            european: splitCompanies(input.europeanCompanies.trim()),
            asian: splitCompanies(input.asianCompanies.trim()),
        },
        ai_config: {
            provider: input.aiProvider,
            api_endpoint: input.apiEndpoint.trim(),
            api_key: input.apiKey.trim() || null,
            model_name: input.modelName.trim(),
            temperature: normalizedTemperature ? Number(normalizedTemperature) : null,
            max_tokens: normalizedMaxTokens ? Number(normalizedMaxTokens) : null,
            top_p: normalizedTopP ? Number(normalizedTopP) : null,
            presence_penalty: normalizedPresencePenalty ? Number(normalizedPresencePenalty) : null,
            frequency_penalty: normalizedFrequencyPenalty ? Number(normalizedFrequencyPenalty) : null,
            timeout_seconds: normalizedTimeoutSeconds ? Number(normalizedTimeoutSeconds) : null,
        },
        prompt_set: {
            european: {
                prompt_name: input.europeanPromptName.trim() || 'european',
                prompt_text: input.europeanPromptText.trim(),
            },
            asian_base: {
                prompt_name: input.asianBasePromptName.trim() || 'asian_base',
                prompt_text: input.asianBasePromptText.trim(),
            },
            final: {
                prompt_name: input.finalPromptName.trim() || 'final',
                prompt_text: input.finalPromptText.trim(),
            },
        },
        fetch_config: {
            cookie: cookieItems[0] || null,
            cookies: cookieItems,
        },
        structured_match: input.structuredMatch ?? null,
        upstream_stage_texts: {
            european: input.upstreamStageTexts?.european?.trim() || null,
            asian_base: input.upstreamStageTexts?.asian_base?.trim() || null,
        },
    };
}
export async function getResponseError(response) {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        const payload = await response.json();
        return payload.detail || payload.message || JSON.stringify(payload);
    }
    return (await response.text()) || '请求失败';
}
export async function callWorkbenchPost(path, payloadInput) {
    const payload = buildPayload(payloadInput);
    console.log(`[DEBUG] POST ${backendBaseUrl}${path}`, JSON.stringify({
        eu_companies: payload.bookmaker_selection.european,
        ah_companies: payload.bookmaker_selection.asian,
        cookie_count: payload.fetch_config.cookies.length,
        match_url: payload.match_url,
    }));
    const response = await fetch(`${backendBaseUrl}${path}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        throw new Error(await getResponseError(response));
    }
    const result = await response.json();
    if (path.includes('test-cookie')) {
        console.log('[DEBUG] test-cookie response parse_summary:', JSON.stringify(result.parse_summary));
        console.log('[DEBUG] test-cookie suggestions:', result.suggestions);
    }
    return result;
}
export async function runWorkbenchStage(stage, payloadInput) {
    const payload = {
        ...buildPayload(payloadInput),
        stage,
    };
    const response = await fetch(`${backendBaseUrl}/analysis/run-stage`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        throw new Error(await getResponseError(response));
    }
    return response.json();
}
export async function loadServerFetchSettings() {
    const response = await fetch(`${backendBaseUrl}/settings/fetch`);
    if (!response.ok) {
        throw new Error(await getResponseError(response));
    }
    return response.json();
}
export async function loadServerAISettings() {
    const response = await fetch(`${backendBaseUrl}/settings/ai`);
    if (!response.ok) {
        throw new Error(await getResponseError(response));
    }
    return response.json();
}
export async function saveServerAISettings(input) {
    const normalizedTemperature = normalizeOptionalNumericInput(input.temperature);
    const normalizedMaxTokens = normalizeOptionalNumericInput(input.maxTokens);
    const normalizedTopP = normalizeOptionalNumericInput(input.topP);
    const normalizedPresencePenalty = normalizeOptionalNumericInput(input.presencePenalty);
    const normalizedFrequencyPenalty = normalizeOptionalNumericInput(input.frequencyPenalty);
    const normalizedTimeoutSeconds = normalizeOptionalNumericInput(input.timeoutSeconds);
    const response = await fetch(`${backendBaseUrl}/settings/ai`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            provider: input.aiProvider,
            api_endpoint: input.apiEndpoint.trim(),
            api_key: input.apiKey.trim() || null,
            model_name: input.modelName.trim(),
            temperature: normalizedTemperature ? Number(normalizedTemperature) : null,
            max_tokens: normalizedMaxTokens ? Number(normalizedMaxTokens) : null,
            top_p: normalizedTopP ? Number(normalizedTopP) : null,
            presence_penalty: normalizedPresencePenalty ? Number(normalizedPresencePenalty) : null,
            frequency_penalty: normalizedFrequencyPenalty ? Number(normalizedFrequencyPenalty) : null,
            timeout_seconds: normalizedTimeoutSeconds ? Number(normalizedTimeoutSeconds) : null,
        }),
    });
    if (!response.ok) {
        throw new Error(await getResponseError(response));
    }
    return response.json();
}
export async function loadServerAnalysisSettings() {
    const response = await fetch(`${backendBaseUrl}/settings/analysis`);
    if (!response.ok) {
        throw new Error(await getResponseError(response));
    }
    return response.json();
}
export async function saveServerAnalysisSettings(input) {
    const response = await fetch(`${backendBaseUrl}/settings/analysis`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            bookmaker_selection: {
                european: splitCompanies(input.europeanCompanies.trim()),
                asian: splitCompanies(input.asianCompanies.trim()),
            },
            prompt_set: {
                european: {
                    prompt_name: input.europeanPromptName.trim() || 'european',
                    prompt_text: input.europeanPromptText.trim(),
                },
                asian_base: {
                    prompt_name: input.asianBasePromptName.trim() || 'asian_base',
                    prompt_text: input.asianBasePromptText.trim(),
                },
                final: {
                    prompt_name: input.finalPromptName.trim() || 'final',
                    prompt_text: input.finalPromptText.trim(),
                },
            },
        }),
    });
    if (!response.ok) {
        throw new Error(await getResponseError(response));
    }
    return response.json();
}
export async function saveServerFetchSettings(fetchCookie) {
    const cookieItems = splitCookies(fetchCookie);
    const response = await fetch(`${backendBaseUrl}/settings/fetch`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            cookie: cookieItems[0] || null,
            cookies: cookieItems,
        }),
    });
    if (!response.ok) {
        throw new Error(await getResponseError(response));
    }
    return response.json();
}
