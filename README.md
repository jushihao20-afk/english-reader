# 英语阅读器

一个纯前端的英语阅读辅助网页应用。它适合用来阅读英语文章、练习听读、查看单词释义，并在段落下方生成对照翻译。

在线访问：

[https://kernelvale.github.io/english-reader/](https://kernelvale.github.io/english-reader/)

## 主要用途

- 上传或粘贴英语文本，在浏览器里整理成适合阅读的段落。
- 朗读全文、单段或选中文本，辅助听读训练。
- 点击单词查看发音、音标、词性、英文释义、例句和目标语言词义。
- 对全文逐段翻译，在英文段落下方显示译文，方便对照阅读。

## 功能

- 支持 TXT、Markdown、HTML 文档的本地解析。
- 支持 PDF、DOCX 文档，浏览器会通过 CDN 加载 PDF.js 或 Mammoth.js 解析。
- 支持全文朗读、整段朗读、选中文本朗读、暂停、继续和停止。
- 支持选择英文朗读声音，并调整语速。
- 慢速朗读会按标点切句并加入停顿，让听感更接近真实慢读。
- 支持中文、日语、韩语、法语和西班牙语词义/段落翻译。
- 点击英语单词会自动发音，并显示字典卡片。

## 项目结构

```text
.
├── index.html          GitHub Pages 根入口，自动跳转到 public/
├── .nojekyll           GitHub Pages 静态发布标记，避免把 README 当作站点首页
├── public/
│   └── index.html      应用页面入口，可直接用浏览器打开
├── src/
│   ├── app.js          浏览器端应用逻辑：文本解析、朗读、翻译、词典卡片
│   └── styles.css      页面样式和响应式布局
├── server.mjs          本地静态文件服务器
├── package.json        项目名称、脚本和元数据
└── README.md           项目说明
```

## 本地运行

方式一：直接打开页面。

```text
public/index.html
```

方式二：启动本地服务器。

```bash
npm start
```

然后访问：

```text
http://localhost:4173
```

## 依赖说明

这个项目没有构建步骤，也不需要安装前端依赖。核心能力来自浏览器和在线服务：

- 朗读：浏览器内置 Web Speech API
- 英文词典：dictionaryapi.dev
- 词义和段落翻译：MyMemory Translation API
- PDF 解析：PDF.js CDN
- DOCX 解析：Mammoth.js CDN

如果浏览器禁用语音、网络不可用，或外部 API/CDN 暂时不可访问，朗读、在线词典、翻译、PDF/DOCX 解析等功能可能会受影响。
