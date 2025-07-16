window.oauthConfig = {
    clientId: '762e4f6f-2af6-437c-ad93-944cc17f9d23',
    scopes: ['inference-api']
}

window.framework = {}
const checkUrls = [];
if (window.location.protocol === "file:") {
    checkUrls.push("http://localhost:1337");
    checkUrls.push("http://localhost:8080");
}
if (["https:", "http:"].includes(window.location.protocol)) {
    checkUrls.push(window.location.origin);
}
checkUrls.push("https://host.g4f.dev");
checkUrls.push("https://phone.g4f.dev");
checkUrls.push("https://home.g4f.dev");
async function checkUrl(url, connectStatus) {
    let response;
    try {
        response = await fetch(`${url}/backend-api/v2/version?cache=true`);
    } catch (error) {
        console.debug("Error check url: ", url);
        return false;
    }
    if (response.ok) {
        connectStatus ? connectStatus.innerText = url : null;
        localStorage.setItem("backendUrl", url);
        framework.backendUrl = url;
        return true;
    }
    return false;
}
framework.backendUrl = localStorage.getItem('backendUrl')
if (framework.backendUrl && !framework.backendUrl.endsWith(".g4f.dev")) {
    framework.backendUrl = "";
}
framework.connectToBackend = async (connectStatus) => {
    for (const url of checkUrls) {
        if(await checkUrl(url, connectStatus)) {
            return;
        }
    }
};

framework.translationKey = "translations" + document.location.pathname;
framework.translations = JSON.parse(localStorage.getItem(framework.translationKey) || "{}");
framework.translateElements = function (elements = null) {
    if (!framework.translations && !document.body.classList.contains("translate")) {
        return;
    }
    elements = elements || document.querySelectorAll("p:not(:has(*)), a:not(:has(*)), h1, h2, h3, h4, h5, h6, button:not(:has(*)), title, span:not(:has(*)), strong, a:not(:has(*)), [data-translate], input, textarea, label:not(:has(span, a, i)), i, option[value='']");
    elements.forEach(function (element) {
        let parent = element.parentElement;
        if (element.classList.contains("notranslate") || parent && parent.classList.contains("notranslate")) {
            return;
        }
        if (element.textContent.trim()) {
            element.textContent = framework.translate(element.textContent);
        }
        if (element.alt) {
            element.alt = framework.translate(element.alt);
        }
        if (element.title) {
            element.title = framework.translate(element.title);
        }
        if (element.placeholder) {
            element.placeholder = framework.translate(element.placeholder);
        }
    });
}
framework.init = async (options) => {
    if (options.translations) {
        framework.translations = true;
    }
}
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", async () => {
                framework.translateElements();
            });
        } else {
            framework.translateElements();
        }
        window.addEventListener('load', async () => {
            if (!localStorage.getItem(framework.translationKey)) {
                try {
                    if (!framework.backendUrl) {
                        await framework.connectToBackend();
                    }
                    if (await framework.translateAll()) {
                        window.location.reload();
                    }
                } catch (e) {
                    console.debug(e);
                }
            }
        });
let newTranslations = [];
framework.translate = (text) => {
    if (text) {
        const endWithSpace = text.endsWith(" ");
        strip_text = text.trim();
        if (strip_text in framework.translations && framework.translations[strip_text]) {
            return framework.translations[strip_text] + (endWithSpace ? " " : "");
        }
        strip_text && !newTranslations.includes(strip_text) ? newTranslations.push(strip_text) : null;
    }
    return text;
};
framework.translateAll = async () =>{
    let allTranslations = {...framework.translations};
    for (const text of newTranslations) {
        allTranslations[text] = "";
    }
    console.log("newTranslations", newTranslations);
    console.log("allTranslations", allTranslations);
    const json_translations = "\n\n```json\n" + JSON.stringify(allTranslations, null, 4) + "\n```";
    const json_language = "`" + navigator.language + "`";
    const prompt = `Translate the following text snippets in a JSON object to ${json_language} (iso code): ${json_translations}`;
    response = await query(prompt, true);
    let translations = await response.json();
    if (translations[navigator.language]) {
        translations = translations[navigator.language];
    }
    localStorage.setItem(framework.translationKey, JSON.stringify(translations || allTranslations));
    return allTranslations;
}
framework.delete = async (bucket_id) => {
    const delete_url = `${framework.backendUrl}/backend-api/v2/files/${encodeURIComponent(bucket_id)}`;
    await fetch(delete_url, {
        method: 'DELETE'
    });
}
async function query(prompt, options={ json: false, cache: true }) {
    if (options === true || options === false) {
        options = { json: options, cache: true };
    }
    const params = {};
    if (options.json) {
        params.json = true;
    }
    if (options.model) {
        params.model = options.model;
    }
    const encodedParams = (new URLSearchParams(params)).toString();
    let liveUrl = `https://text.pollinations.ai/${encodeURIComponent(prompt)}`;
    if (encodedParams) {
        liveUrl += "?" + encodedParams
    }
    const response = await fetch(liveUrl);
    if (response.status !== 200) {
        const fallbackParams = { prompt: prompt };
        if (options.model) {
            fallbackParams.model = options.model;
        }
        if (options.json) {
            fallbackParams.filter_markdown = true;
        }
        if (options.cache) {
            fallbackParams.cache = true;
        }
        const fallbackEncodedParams = (new URLSearchParams(fallbackParams)).toString();
        const fallbackUrl = `${framework.backendUrl}/backend-api/v2/create?${fallbackEncodedParams}`;
        const response = await fetch(fallbackUrl);
        if (response.status !== 200) {
            console.error("Error on query: ", response.statusText);
            return;
        }
    }
    return response;
}
const renderMarkdown = (content) => {
    if (!content) {
        return "";
    }
    if (!window.markdownit) {
        return escapeHtml(content);
    }
    if (Array.isArray(content)) {
        content = content.map((item) => {
            if (!item.name) {
                if (item.text) {
                    return item.text;
                }
                size = parseInt(appStorage.getItem(`bucket:${item.bucket_id}`), 10);
                return `**Bucket:** [[${item.bucket_id}]](${item.url})${size ? ` (${formatFileSize(size)})` : ""}`
            }
            if (item.name.endsWith(".wav") || item.name.endsWith(".mp3")) {
                return `<audio controls src="${item.url}"></audio>` + (item.text ? `\n${item.text}` : "");
            }
            if (item.name.endsWith(".mp4") || item.name.endsWith(".webm")) {
                return `<video controls src="${item.url}"></video>` + (item.text ? `\n${item.text}` : "");
            }
            if (item.width && item.height) {
                return `<a href="${item.url}" data-width="${item.width}" data-height="${item.height}"><img src="${item.url.replaceAll("/media/", "/thumbnail/") || item.image_url?.url}" alt="${framework.escape(item.name)}"></a>`;
            }
            return `[![${item.name}](${item.url.replaceAll("/media/", "/thumbnail/") || item.image_url?.url})](${item.url || item.image_url?.url})`;
        }).join("\n");
    }
    const markdown = window.markdownit({
        html: window.sanitizeHtml ? true : false,
        breaks: true
    });
    content = markdown.render(content)
        .replaceAll("<a href=", '<a target="_blank" href=')
        .replaceAll('<code>', '<code class="language-plaintext">')
        .replaceAll('<iframe src="', '<iframe frameborder="0" height="400" width="400" src="')
        .replaceAll('<iframe type="text/html" src="', '<iframe type="text/html" frameborder="0" allow="fullscreen" height="224" width="400" src="')
        .replaceAll('"></iframe>', `?enablejsapi=1"></iframe>`)
        .replaceAll('src="/media/', `src="${framework.backendUrl}/media/`)
        .replaceAll('src="/thumbnail/', `src="${framework.backendUrl}/thumbnail/`)
        .replaceAll('href="/media/', `src="${framework.backendUrl}/media/`)
    if (window.sanitizeHtml) {
        content = window.sanitizeHtml(content, {
            allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'iframe', 'audio', 'video']),
            allowedAttributes: {
                a: [ 'href', 'title', 'target', 'data-width', 'data-height' ],
                i: [ 'class' ],
                code: [ 'class' ],
                img: [ 'src', 'alt', 'width', 'height' ],
                iframe: [ 'src', 'type', 'frameborder', 'allow', 'height', 'width' ],
                audio: [ 'src', 'controls' ],
                video: [ 'src', 'controls', 'loop', 'autoplay', 'muted' ],
            },
            allowedIframeHostnames: ['www.youtube.com']
        });
    }
    return content;
};
function escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}
function filterMarkdown(text, allowedTypes = null, defaultValue = null) {
    const match = text.match(/```(.+)\n(?<code>[\s\S]+?)(\n```|$)/);
    if (match) {
        const [, type, code] = match;
        if (!allowedTypes || allowedTypes.includes(type)) {
            return code;
        }
    }
    return defaultValue;
}
async function gen() {
    const user = userInput.value.trim();
    if (!user) {
    showMessage('Please enter a valid user ID.');
    return;
    }
    document.getElementById('apiBaseUrl').value = framework.backendUrl + "/api/Azure"
    showMessage('Loading...');
    if (!localStorage.getItem(userKey)) localStorage.setItem(userKey, user);

    try {
    const publicKey = await framework.getPublicKey();

    const encrypt = new JSEncrypt();
    encrypt.setPublicKey(publicKey.public_key);

    const payload = {
        data: publicKey.data,
        user,
        timestamp: Date.now(),
        user_agent: navigator.userAgent
    };
    const payloadStr = JSON.stringify(payload);
    const encrypted = encrypt.encrypt(payloadStr);

    if(!encrypted) {
        throw new Error('Encryption failed. Please try again.');
    }
    localStorage.setItem("Azure-api_key", encrypted);
    showMessage(encrypted);
    } catch (error) {
    showMessage('Error generating API key: ' + error.message);
    }
}
async function getPublicKey() {
    const response = await fetch(`${framework.backendUrl}/backend-api/v2/public-key`);
    if (response.ok) {
        return await response.json();
    }
    throw new Error("Failed to load public key");
}
async function getHeaders() {
    const headers = {}
    const user = localStorage.getItem("user");
    if (user) {
        headers["x-user"] = user;
    }
    try {
        const encrypt = new JSEncrypt();
        const publicKey = await getPublicKey();
        encrypt.setPublicKey(publicKey.public_key);
        const headerKey = ["x_", "sec", "ret"].join("")
        headers[headerKey] = encrypt.encrypt(publicKey.data);
        return headers;
    } catch (error) {
        console.error("Encryption failed:", error);
    }
    return headers;
}
async function includeAdsense(params) {
    const script = document.createElement("script");
    script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5896143631849307";
    script.async = true;
    script.crossOrigin = "anonymous";
    document.head.appendChild(script);
}
if (window.location.origin.endsWith(".g4f.dev") || window.location.origin === "https://g4f.dev") {
    includeAdsense().catch(console.error);
}
framework.query = query;
framework.markdown = renderMarkdown;
framework.filterMarkdown = filterMarkdown;
framework.escape = escapeHtml;
framework.getHeaders = getHeaders;
framework.getPublicKey = getPublicKey;