const els = {
  textInput: document.querySelector("#textInput"),
  renderButton: document.querySelector("#renderButton"),
  sampleButton: document.querySelector("#sampleButton"),
  clearButton: document.querySelector("#clearButton"),
  fileInput: document.querySelector("#fileInput"),
  dropZone: document.querySelector("#dropZone"),
  reader: document.querySelector("#reader"),
  voiceSelect: document.querySelector("#voiceSelect"),
  targetLang: document.querySelector("#targetLang"),
  rateRange: document.querySelector("#rateRange"),
  rateValue: document.querySelector("#rateValue"),
  readAllButton: document.querySelector("#readAllButton"),
  pauseButton: document.querySelector("#pauseButton"),
  stopButton: document.querySelector("#stopButton"),
  selectionBar: document.querySelector("#selectionBar"),
  selectionPreview: document.querySelector("#selectionPreview"),
  readSelectionButton: document.querySelector("#readSelectionButton"),
  statusDot: document.querySelector("#statusDot"),
  statusText: document.querySelector("#statusText"),
  wordCard: document.querySelector("#wordCard"),
  cardWord: document.querySelector("#cardWord"),
  wordLanguage: document.querySelector("#wordLanguage"),
  closeCardButton: document.querySelector("#closeCardButton"),
  speakWordButton: document.querySelector("#speakWordButton"),
  phoneticText: document.querySelector("#phoneticText"),
  definitionList: document.querySelector("#definitionList"),
  translationText: document.querySelector("#translationText")
};

const sampleText = `The best readers are not passive. They notice rhythm, pause at unfamiliar words, and test meaning against context.

When you read an English paragraph aloud, your ears can catch patterns that your eyes may miss. Try selecting only this sentence and listening to it once.

Curiosity is a practical skill. Each word you inspect becomes a small doorway into pronunciation, usage, and memory.`;

const fallbackDictionary = {
  learning: "学习",
  english: "英语",
  reader: "阅读器；读者",
  reading: "阅读",
  active: "主动的；活跃的",
  select: "选择",
  sentence: "句子",
  aloud: "大声地",
  word: "单词",
  dictionary: "字典",
  pronunciation: "发音",
  translation: "翻译",
  paragraph: "段落",
  curiosity: "好奇心",
  practical: "实用的",
  skill: "技能",
  context: "上下文",
  memory: "记忆",
  rhythm: "节奏",
  meaning: "意义"
};

let voices = [];
let currentUtterance = null;
let activeWord = null;
let lastLookupController = null;
let pdfModule = null;

function setStatus(text, speaking = false) {
  els.statusText.textContent = text;
  els.statusDot.classList.toggle("speaking", speaking);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function tokenizeParagraph(paragraph) {
  return paragraph
    .split(/([A-Za-z]+(?:['-][A-Za-z]+)?)/g)
    .map((part) => {
      if (/^[A-Za-z]+(?:['-][A-Za-z]+)?$/.test(part)) {
        const clean = part.toLowerCase();
        return `<span class="word" role="button" tabindex="0" data-word="${escapeHtml(clean)}">${escapeHtml(part)}</span>`;
      }
      return escapeHtml(part);
    })
    .join("");
}

function renderText(rawText) {
  const text = rawText.replace(/\r\n?/g, "\n").trim();

  if (!text) {
    els.reader.innerHTML = `<p class="reader-placeholder">阅读区暂无内容。上传文档或输入文本后，点击“载入阅读区”。</p>`;
    return;
  }

  const paragraphs = text
    .split(/\n{2,}/)
    .map((part) => part.replace(/\n/g, " ").trim())
    .filter(Boolean);

  els.reader.innerHTML = paragraphs
    .map((paragraph, index) => `
      <p class="paragraph" data-paragraph="${index}">
        <button class="paragraph-play" type="button" title="朗读本段" data-read-paragraph="${index}">▶</button>
        ${tokenizeParagraph(paragraph)}
      </p>
    `)
    .join("");

  setStatus(`已载入 ${paragraphs.length} 段`);
}

function getReadableText() {
  return Array.from(els.reader.querySelectorAll(".paragraph"))
    .map((paragraph) => paragraph.innerText.replace(/^▶\s*/, "").trim())
    .filter(Boolean)
    .join("\n\n");
}

function selectedVoice() {
  const selectedName = els.voiceSelect.value;
  return voices.find((voice) => voice.name === selectedName) || voices.find((voice) => voice.lang.startsWith("en"));
}

function speak(text, status = "朗读中") {
  const cleanText = text.replace(/\s+/g, " ").trim();
  if (!cleanText) {
    setStatus("没有可朗读内容");
    return;
  }

  window.speechSynthesis.cancel();
  currentUtterance = new SpeechSynthesisUtterance(cleanText);
  currentUtterance.lang = selectedVoice()?.lang || "en-US";
  currentUtterance.voice = selectedVoice() || null;
  currentUtterance.rate = Number(els.rateRange.value);
  currentUtterance.pitch = 1;
  currentUtterance.onstart = () => setStatus(status, true);
  currentUtterance.onend = () => setStatus("朗读完成");
  currentUtterance.onerror = () => setStatus("朗读被中断");
  window.speechSynthesis.speak(currentUtterance);
}

function loadVoices() {
  voices = window.speechSynthesis
    .getVoices()
    .filter((voice) => voice.lang.toLowerCase().startsWith("en"));

  if (!voices.length) {
    els.voiceSelect.innerHTML = `<option value="">English voice</option>`;
    return;
  }

  els.voiceSelect.innerHTML = voices
    .map((voice) => `<option value="${escapeHtml(voice.name)}">${escapeHtml(voice.name)} · ${escapeHtml(voice.lang)}</option>`)
    .join("");

  const preferred = voices.find((voice) => voice.lang === "en-US") || voices[0];
  els.voiceSelect.value = preferred.name;
}

function updateSelectionBar() {
  const selection = document.getSelection();
  const text = selection?.toString().replace(/\s+/g, " ").trim() || "";
  const inReader = selection?.rangeCount
    ? els.reader.contains(selection.getRangeAt(0).commonAncestorContainer)
    : false;

  if (text && inReader) {
    els.selectionPreview.textContent = text.length > 120 ? `${text.slice(0, 120)}...` : text;
    els.selectionBar.hidden = false;
  } else {
    els.selectionBar.hidden = true;
  }
}

function showCardAt(event) {
  const cardWidth = Math.min(360, window.innerWidth - 32);
  const left = Math.min(event.clientX + 12, window.innerWidth - cardWidth - 16);
  const top = Math.min(event.clientY + 12, window.innerHeight - 220);
  els.wordCard.style.left = `${Math.max(16, left)}px`;
  els.wordCard.style.top = `${Math.max(16, top)}px`;
  els.wordCard.style.right = "auto";
  els.wordCard.style.bottom = "auto";
  els.wordCard.hidden = false;
}

function resetCard(word) {
  els.cardWord.textContent = word;
  els.wordLanguage.textContent = "English word";
  els.phoneticText.textContent = "查询中...";
  els.definitionList.innerHTML = `<div class="definition-item"><span>lookup</span><p>正在查询字典释义。</p></div>`;
  els.translationText.textContent = "查询中...";
}

async function lookupDictionary(word, signal) {
  const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, { signal });
  if (!response.ok) {
    throw new Error("Dictionary lookup failed");
  }
  const [entry] = await response.json();
  const phonetic = entry.phonetic || entry.phonetics?.find((item) => item.text)?.text || "";
  const audio = entry.phonetics?.find((item) => item.audio)?.audio || "";
  const definitions = (entry.meanings || [])
    .flatMap((meaning) => (meaning.definitions || []).slice(0, 2).map((definition) => ({
      partOfSpeech: meaning.partOfSpeech,
      definition: definition.definition,
      example: definition.example
    })))
    .slice(0, 4);

  return { phonetic, audio, definitions };
}

async function lookupTranslation(word, signal) {
  const target = els.targetLang.value;
  const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|${encodeURIComponent(target)}`, { signal });
  if (!response.ok) {
    throw new Error("Translation lookup failed");
  }
  const data = await response.json();
  return data?.responseData?.translatedText || fallbackDictionary[word] || "暂无翻译";
}

function renderDefinitions(result, word) {
  els.phoneticText.textContent = result.phonetic || "暂无音标";
  els.speakWordButton.dataset.audio = result.audio || "";

  if (!result.definitions.length) {
    els.definitionList.innerHTML = `<div class="definition-item"><span>meaning</span><p>${fallbackDictionary[word] || "暂无英文释义"}</p></div>`;
    return;
  }

  els.definitionList.innerHTML = result.definitions
    .map((item) => `
      <div class="definition-item">
        <span>${escapeHtml(item.partOfSpeech || "meaning")}</span>
        <p>${escapeHtml(item.definition)}</p>
        ${item.example ? `<p><em>${escapeHtml(item.example)}</em></p>` : ""}
      </div>
    `)
    .join("");
}

async function openWordCard(word, event) {
  if (!word) {
    return;
  }

  lastLookupController?.abort();
  lastLookupController = new AbortController();
  resetCard(word);
  showCardAt(event);

  try {
    const [dictionary, translation] = await Promise.allSettled([
      lookupDictionary(word, lastLookupController.signal),
      lookupTranslation(word, lastLookupController.signal)
    ]);

    if (dictionary.status === "fulfilled") {
      renderDefinitions(dictionary.value, word);
    } else {
      els.phoneticText.textContent = "暂无音标";
      els.definitionList.innerHTML = `<div class="definition-item"><span>fallback</span><p>${fallbackDictionary[word] || "在线字典暂不可用，可点击发音继续练习。"}</p></div>`;
    }

    els.translationText.textContent = translation.status === "fulfilled"
      ? translation.value
      : fallbackDictionary[word] || "翻译服务暂不可用";
  } catch {
    els.translationText.textContent = fallbackDictionary[word] || "查询已取消";
  }
}

function normalizeLoadedText(htmlOrText, type) {
  if (type.includes("html")) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlOrText, "text/html");
    return doc.body.innerText;
  }
  return htmlOrText;
}

async function readPdf(file) {
  pdfModule ||= await import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs");
  const pdfjs = pdfModule;
  if (!pdfjs) {
    throw new Error("PDF 解析库尚未加载，请稍后再试或检查网络。");
  }
  pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buffer }).promise;
  const pages = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => item.str).join(" "));
  }

  return pages.join("\n\n");
}

async function readDocx(file) {
  if (!globalThis.mammoth) {
    throw new Error("DOCX 解析库尚未加载，请稍后再试或检查网络。");
  }
  const buffer = await file.arrayBuffer();
  const result = await globalThis.mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value;
}

async function readFile(file) {
  const name = file.name.toLowerCase();
  setStatus(`正在读取 ${file.name}`);

  if (name.endsWith(".pdf")) {
    return readPdf(file);
  }

  if (name.endsWith(".docx") || name.endsWith(".doc")) {
    return readDocx(file);
  }

  const text = await file.text();
  return normalizeLoadedText(text, file.type);
}

function bindEvents() {
  els.renderButton.addEventListener("click", () => renderText(els.textInput.value));
  els.sampleButton.addEventListener("click", () => {
    els.textInput.value = sampleText;
    renderText(sampleText);
  });
  els.clearButton.addEventListener("click", () => {
    window.speechSynthesis.cancel();
    els.textInput.value = "";
    renderText("");
    setStatus("已清空");
  });

  els.fileInput.addEventListener("change", async (event) => {
    const [file] = event.target.files || [];
    if (!file) {
      return;
    }
    try {
      const text = await readFile(file);
      els.textInput.value = text;
      renderText(text);
    } catch (error) {
      setStatus(error.message || "读取失败");
    }
  });

  ["dragenter", "dragover"].forEach((type) => {
    els.dropZone.addEventListener(type, (event) => {
      event.preventDefault();
      els.dropZone.classList.add("dragging");
    });
  });

  ["dragleave", "drop"].forEach((type) => {
    els.dropZone.addEventListener(type, () => els.dropZone.classList.remove("dragging"));
  });

  els.dropZone.addEventListener("drop", async (event) => {
    event.preventDefault();
    const [file] = event.dataTransfer.files || [];
    if (!file) {
      return;
    }
    try {
      const text = await readFile(file);
      els.textInput.value = text;
      renderText(text);
    } catch (error) {
      setStatus(error.message || "读取失败");
    }
  });

  els.reader.addEventListener("click", (event) => {
    const paragraphButton = event.target.closest("[data-read-paragraph]");
    if (paragraphButton) {
      const paragraph = paragraphButton.closest(".paragraph");
      speak(paragraph.innerText.replace(/^▶\s*/, ""), "朗读段落");
      return;
    }

    const wordEl = event.target.closest(".word");
    if (!wordEl) {
      return;
    }
    activeWord?.classList.remove("active");
    activeWord = wordEl;
    activeWord.classList.add("active");
    openWordCard(wordEl.dataset.word, event);
  });

  els.reader.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    const wordEl = event.target.closest(".word");
    if (wordEl) {
      event.preventDefault();
      openWordCard(wordEl.dataset.word, event);
    }
  });

  document.addEventListener("selectionchange", updateSelectionBar);
  els.reader.addEventListener("mouseup", updateSelectionBar);
  els.reader.addEventListener("keyup", updateSelectionBar);

  els.readSelectionButton.addEventListener("click", () => {
    const text = document.getSelection()?.toString() || "";
    speak(text, "朗读选中");
  });

  els.readAllButton.addEventListener("click", () => speak(getReadableText(), "朗读全文"));
  els.pauseButton.addEventListener("click", () => {
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      setStatus("已暂停");
    } else {
      window.speechSynthesis.resume();
      setStatus("继续朗读", true);
    }
  });
  els.stopButton.addEventListener("click", () => {
    window.speechSynthesis.cancel();
    setStatus("已停止");
  });

  els.rateRange.addEventListener("input", () => {
    els.rateValue.textContent = Number(els.rateRange.value).toFixed(1);
  });

  els.closeCardButton.addEventListener("click", () => {
    els.wordCard.hidden = true;
    activeWord?.classList.remove("active");
  });

  els.speakWordButton.addEventListener("click", () => {
    const audioUrl = els.speakWordButton.dataset.audio;
    if (audioUrl) {
      new Audio(audioUrl).play();
      return;
    }
    speak(els.cardWord.textContent, "朗读单词");
  });
}

bindEvents();
loadVoices();
window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
renderText(els.textInput.value);
