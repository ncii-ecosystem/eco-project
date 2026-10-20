/* Interactive SVG of the paper's technology ecosystem, used by the About explorer. */
export function mountSystemChart({ Eco = window.Eco, mon = document.getElementById('mon-screen') } = {}) {

  if (!Eco || !mon) return;

  const NS = 'http://www.w3.org/2000/svg';
  const W = 1648;
  let H = 1628;                       // the figure's own coordinate space

  /* role → fill colour (the site's pastel chips) */
  const ROLE = {
    creation: 'var(--role-creation)', distribution: 'var(--role-distribution)', discovery: 'var(--role-proliferation)',
    infra: 'var(--role-infra)', money: 'var(--role-monetization)',
  };

  /* What each role means, in the paper's words, for the legend notes */
  const ROLE_INFO = {
    creation: { title: 'Creation', text: 'Contributes to the non-consensual creation of AI-generated intimate images.',
      tech: ['Training Datasets', 'Generative AI Models', 'Generative AI Interfaces'] },
    distribution: { title: 'Distribution', text: 'Contributes to the non-consensual distribution of AI-generated intimate images.',
      tech: ['Distribution Channels'] },
    discovery: { title: 'Proliferation & Discovery', text: 'Contributes to the proliferation and discovery of technologies used to non-consensually create and distribute AI-generated intimate images.',
      tech: ['Deepfake Creation Communities', 'Search Engines', 'Advertisement Platforms', 'App Stores'] },
    infra: { title: 'Infrastructural Support', text: 'Provides critical infrastructural support that allows technologies on the creation and distribution levels to function.',
      tech: ['Developer Platforms', 'Critical Service Providers'] },
    money: { title: 'Monetization', text: 'Enables the monetization of non-consensual creation and distribution of AI-generated intimate images.',
      tech: ['Payment Processors'] },
  };

  /* Icons are Font Awesome glyphs */
  const ICON = {
    cart: '', bullhorn: '', search: '', laptop: '', database: '', code: '',
    wand: '\uf0d0', comment: '', users: '', tools: '', money: '',
  };

  /* Boxes. Lines: ['h', text] = bold sub-heading. Only generic categories are drawn here; the real
     examples and their sources appear in the Notes window when a box is opened. */
  const NODES = [
    { id: 'app-stores', role: 'discovery', x: 862, y: 38, w: 325, h: 124, icon: 'cart', title: 'App Stores', lines: [], small: true },
    { id: 'ad-platforms', role: 'discovery', x: 862, y: 202, w: 325, h: 107, icon: 'bullhorn', title: 'Ad Platforms', lines: [], small: true },
    { id: 'search-engines', role: 'discovery', x: 862, y: 349, w: 736, h: 108, icon: 'search', title: 'Search Engines', lines: [], wide: true },
    { id: 'dev-platforms', role: 'infra', x: 28, y: 349, w: 749, h: 108, icon: 'laptop', title: 'Developer Platforms', lines: [], wide: true },
    { id: 'training-data', role: 'creation', x: 28, y: 530, w: 323, h: 505, icon: 'database', title: 'Training Datasets', tall: true,
      lines: [['h', 'Open Data'], ['gap'], ['h', 'Closed Data']] },
    { id: 'ai-models', role: 'creation', x: 437, y: 530, w: 338, h: 505, icon: 'code', title: 'Generative AI Models', tall: true,
      lines: [['h', 'Open Source Models'], ['gap'], ['h', 'Open Weight Models &'], ['h', 'Variants'], ['gap'], ['h', 'Closed Models']] },
    { id: 'ai-interfaces', role: 'creation', x: 862, y: 530, w: 325, h: 505, icon: 'wand', title: 'Generative AI Interfaces', tall: true,
      lines: [['h', 'General Purpose Model'], ['h', 'Interfaces'], ['gap'], ['h', 'AI Nudifier Applications']] },
    { id: 'dist-channels', role: 'distribution', x: 1273, y: 530, w: 325, h: 505, icon: 'comment', title: 'Distribution Channels', tall: true,
      lines: [['h', 'Private Channels'], ['gap'], ['h', 'Public Platforms']] },
    { id: 'dfcc', role: 'discovery', x: 28, y: 1131, w: 1570, h: 144, icon: 'users', title: 'Deepfake Creation Communities', wide: true,
      lines: [['h', 'Private Channels and Public Platforms']] },
    { id: 'critical-providers', role: 'infra', x: 28, y: 1320, w: 1570, h: 122, icon: 'tools', title: 'Critical Service Providers', wide: true,
      lines: [['m', 'Cloud Service Providers, Domain Name Services, and Authentication Services']] },
    { id: 'payment-processors', role: 'money', x: 26, y: 1487, w: 1572, h: 116, icon: 'money', title: 'Payment Processors', wide: true, lines: [] },
  ];

  function contentRows(n) {
    const rows = [
      { text: ICON[n.icon], className: 'eg-icon', size: 32, height: 36 },
      { height: n.tall ? 20 : 10 },
      { text: n.title, className: 'eg-title', size: 25, height: 30 },
    ];
    if (n.lines.length) rows.push({ height: n.tall ? 24 : 10 });
    n.lines.forEach(line => {
      if (line[0] === 'gap') rows.push({ height: n.tall ? 20 : 12 });
      else rows.push({ text: line.slice(1).join(' '), className: line[0] === 'm' ? 'eg-m' : 'eg-h', size: 21, height: 28 });
    });
    return rows;
  }
  const middle = NODES.filter(node => node.tall);
  const middleHeight = Math.max(...middle.map(node => contentRows(node).reduce((sum, row) => sum + row.height, 0) + 64));
  middle.forEach(node => { node.h = middleHeight; });
  const shift = 1035 - Math.max(...middle.map(node => node.y + node.h));
  NODES.filter(node => node.y > 1035).forEach(node => { node.y -= shift; });
  H -= shift;
  const nodeById = Object.fromEntries(NODES.map(node => [node.id, node]));

  /* Links between boxes; `dir` says where the arrowhead goes */
  const XS = [189, 606, 1024, 1436];
  const EDGES = [
    { a: 'app-stores', b: 'ad-platforms', d: 'M1024 162 V202', dots: [[1024, 162], [1024, 202]] },
    { a: 'ad-platforms', b: 'search-engines', d: 'M1024 309 V349', dots: [[1024, 309], [1024, 349]] },
    { a: 'dev-platforms', b: 'training-data', d: 'M187 457 V520', dots: [[187, 457]], head: [187, 530, 'down'] },
    { a: 'dev-platforms', b: 'ai-models', d: 'M606 457 V520', dots: [[606, 457]], head: [606, 530, 'down'] },
    { a: 'search-engines', b: 'ai-interfaces', d: 'M1024 457 V520', dots: [[1024, 457]], head: [1024, 530, 'down'] },
    { a: 'search-engines', b: 'dist-channels', d: 'M1436 457 V520', dots: [[1436, 457]], head: [1436, 530, 'down'] },
    { a: 'training-data', b: 'ai-models', d: 'M351 765 H427', dots: [[351, 765]], head: [437, 765, 'right'], accent: true },
    { a: 'ai-models', b: 'ai-interfaces', d: 'M775 765 H852', dots: [[775, 765]], head: [862, 765, 'right'] },
    { a: 'ai-interfaces', b: 'dist-channels', d: 'M1187 765 H1263', dots: [[1187, 765]], head: [1273, 765, 'right'] },
  ];
  EDGES.filter(edge => nodeById[edge.a].tall && nodeById[edge.b].tall).forEach(edge => {
    const a = nodeById[edge.a], b = nodeById[edge.b];
    const y1 = a.y + a.h / 2, y2 = b.y + b.h / 2;
    edge.d = `M${a.x + a.w} ${y1} L${b.x - 10} ${y2}`;
    edge.dots = [[a.x + a.w, y1]];
    edge.head = [b.x, y2, 'right'];
  });
  const COMMUNITY_TARGETS = ['training-data', 'ai-models', 'ai-interfaces', 'dist-channels'];
  XS.forEach((x, i) => {
    const target = nodeById[COMMUNITY_TARGETS[i]];
    const community = nodeById.dfcc, providers = nodeById['critical-providers'], payments = nodeById['payment-processors'];
    const bottom = target.y + target.h;
    EDGES.push({ a: 'dfcc', b: target.id, d: `M${x} ${community.y} V${bottom + 10}`, dots: [[x, community.y]], head: [x, bottom, 'up'] });
    EDGES.push({ a: 'dfcc', b: providers.id, d: `M${x} ${community.y + community.h} V${providers.y}`, dots: [[x, community.y + community.h], [x, providers.y]] });
    EDGES.push({ a: providers.id, b: payments.id, d: `M${x} ${providers.y + providers.h} V${payments.y}`, dots: [[x, providers.y + providers.h], [x, payments.y]] });
  });

  /* What each box says when it is opened: the paper's own wording, the same text as the Notes entries */
  const DETAILS = {
    'training-data': { role: "Creation", roleLine: "Contributes to the non-consensual creation of AI-generated intimate images.", title: "Training Datasets", body: "<p>Training datasets refer to text, image, video, audio, and/or multi-modal datasets used to train generative AI models.</p><p>In the early 2010s face-swap models were trained using open-source face datasets and other curated NSFW datasets comprised primarily of women. An early <a href='https://regmedia.co.uk/2019/10/08/deepfake_report.pdf' target='_blank' rel='noopener noreferrer'>study</a> of the 2019 DeepNude undressing app found that it was unable to generate images of men because it was trained only on images of women. Researchers have found that “general-purpose” image datasets like <a href='https://purl.stanford.edu/kh752sm9123' target='_blank' rel='noopener noreferrer'>LAION-5B</a>, <a href='https://arxiv.org/abs/2006.16923' target='_blank' rel='noopener noreferrer'>ImageNet</a>, and <a href='https://arxiv.org/abs/2110.01963' target='_blank' rel='noopener noreferrer'>LAION-400M</a> also contain pornography, non-consensual intimate images, and/or known CSAM, enabling models that train upon them to generate AIG-NCII.</p>" },
    'ai-models': { role: "Creation", roleLine: "Contributes to the non-consensual creation of AI-generated intimate images.", title: "Generative AI Models", body: "<p>Generative AI Models refer to a spectrum of models that use deep learning techniques to take in an input and produce a modified output.</p><p>In the 2010s, smaller, independent, <strong>open-source models</strong> primarily used <a href='https://regmedia.co.uk/2019/10/08/deepfake_report.pdf' target='_blank' rel='noopener noreferrer'>generative adversarial networks</a> (GANs) to automate the face-swapping process. DeepFaceLab in particular had direct ties to Mr.DeepFakes, a <a href='https://arxiv.org/abs/2410.11100' target='_blank' rel='noopener noreferrer'>prolific</a> “deepfake pornography” <a href='https://www.tsjournal.org/index.php/jots/article/view/126' target='_blank' rel='noopener noreferrer'>community</a> and hosting site. Early models required a high level of technical expertise and were inconsistent in quality and realism. However, the images they produced, despite being less realistic, were still extremely <a href='https://journals.sagepub.com/doi/10.1177/0964663920947791' target='_blank' rel='noopener noreferrer'>harmful</a> to victim-survivors depicted and publicly <a href='https://www.vice.com/en/article/reddit-fake-porn-app-daisy-ridley/' target='_blank' rel='noopener noreferrer'>documented</a> and criticized by researchers, activists, and journalists.</p><p>With the 2020s came larger and more powerful generative AI models that produced realistic outputs. <strong>Open-weight models</strong> like Stable Diffusion and Flux have been fine-tuned to produce tens of thousands of fine-tuned <a href='https://arxiv.org/abs/2505.03859' target='_blank' rel='noopener noreferrer'>variants</a> designed to produce AIG-NCII, predominantly of women. This trend is now being <a href='https://arxiv.org/abs/2512.11815' target='_blank' rel='noopener noreferrer'>replicated</a> with open-weight video-generation models. Additionally, proprietary <strong>closed models</strong> like xAI’s <a href='https://www.404media.co/groks-ai-csam-shitshow/' target='_blank' rel='noopener noreferrer'>Aurora</a>, Google’s <a href='https://www.wired.com/story/google-and-openais-chatbots-can-strip-women-in-photos-down-to-bikinis/' target='_blank' rel='noopener noreferrer'>Gemini</a> models, and OpenAI’s <a href='https://www.wired.com/story/google-and-openais-chatbots-can-strip-women-in-photos-down-to-bikinis/' target='_blank' rel='noopener noreferrer'>GPT</a> models can be used via chatbot interface or API access to generate AIG-NCII.</p>" },
    'ai-interfaces': { role: "Creation", roleLine: "Contributes to the non-consensual creation of AI-generated intimate images.", title: "Generative AI Interfaces", body: "<p>Generative AI Interfaces increase the accessibility of AIG-NCII by providing an easy-to-use interface (e.g., computer software, website, or mobile app) for users to access generative AI model capabilities.</p><p>In the 2010s face-swap era, there were already <a href='https://www.vice.com/en/article/deepnude-app-creates-fake-nudes-of-any-woman/' target='_blank' rel='noopener noreferrer'>undressing</a> apps like <a href='https://regmedia.co.uk/2019/10/08/deepfake_report.pdf' target='_blank' rel='noopener noreferrer'>DeepNude</a> that had over 95k active users. However, in the 2020s with the advancement of generative AI technology, <strong>AI nudifier applications</strong> became a rapidly growing <a href='https://indicator.media/p/ai-nudifiers-continue-to-reach-millions-and-make-millions' target='_blank' rel='noopener noreferrer'>multi-million</a> dollar economy dedicated to the creation and <a href='https://arxiv.org/abs/2411.09751' target='_blank' rel='noopener noreferrer'>monetization</a> of AIG-NCII, <a href='https://journals.sagepub.com/doi/10.1177/10778012251397966' target='_blank' rel='noopener noreferrer'>predominantly</a> of young women. AI nudifier applications significantly lower the barrier to entry to creating AIG-NCII because any non-technical user can upload a photo of another person (like a <a href='https://www.404media.co/ai-porn-secret-desires-chatbot-face-swap/' target='_blank' rel='noopener noreferrer'>yearbook photo</a> or social media post) and create an “undressed” version of that person within minutes without their consent. The apps offer varying <a href='https://arxiv.org/abs/2411.09751' target='_blank' rel='noopener noreferrer'>features</a> including undressing and positioning the subject in various sexual positions.</p><p>In addition to single-purpose AI nudifier applications, <strong>general purpose model interfaces</strong> have also been used to produce AIG-NCII. WIRED <a href='https://www.wired.com/story/google-and-openais-chatbots-can-strip-women-in-photos-down-to-bikinis/' target='_blank' rel='noopener noreferrer'>found</a> that ChatGPT and Gemini have been used to “strip women in photos down to bikinis.” Most notably, Grok has been used to generate <a href='https://www.bloomberg.com/news/articles/2026-01-07/musk-s-grok-ai-generated-thousands-of-undressed-images-per-hour-on-x' target='_blank' rel='noopener noreferrer'>thousands</a> of images of women and girls directly into the comment section of X. As AI companies begin adding “spicy” and “erotica” modes into their chatbot products, <a href='https://rainn.org/groks-spicy-ai-video-setting-will-lead-to-sexual-abuse/' target='_blank' rel='noopener noreferrer'>advocates</a> are also sounding alarm bells for the predictable proliferation of AIG-NCII.</p>" },
    'dist-channels': { role: "Distribution", roleLine: "Contributes to the non-consensual distribution of AI-generated intimate images.", title: "Distribution Channels", body: "<p>Distribution Channels include both the private channels and public platforms that AI-generated intimate images may be non-consensually distributed across.</p><p>A 2024 <a href='https://cdt.org/wp-content/uploads/2024/09/2024-09-26-final-Civic-Tech-Fall-Polling-research-1.pdf' target='_blank' rel='noopener noreferrer'>survey</a> by the Center for Democracy &amp; Technology of K-12 school students and teachers found that AI-generated NCII was most commonly shared through public channels (e.g., posting on social media platforms or adult sites) and private channels (e.g., direct message, text message, email). These trends also align with traditional <a href='https://arxiv.org/abs/2403.04659' target='_blank' rel='noopener noreferrer'>channels</a> of non-consensual distribution of intimate images.</p><p>Under the public platform category, there are also “deepfake pornography sites” such as <a href='https://www.tsjournal.org/index.php/jots/article/view/126' target='_blank' rel='noopener noreferrer'>Mr.Deepfakes</a> that are dedicated to the distribution of AIG-NCII. In 2024, the American Sunlight Project <a href='https://static1.squarespace.com/static/6612cbdfd9a9ce56ef931004/t/67586997eaec5c6ae3bb5e24/1733847451191/ASP+DFP+Report.pdf' target='_blank' rel='noopener noreferrer'>discovered</a> tens of thousands of AIG-NCII depicting 26 senators and members of congress, 25 of them women, across eleven “deepfake pornography” websites. Activists and researchers have <a href='https://docs.google.com/spreadsheets/d/1vM-J_9NvOc4xHKbqqlZWzpQ0a0zsrDX-7Jx-wPn1hwg/edit?gid=224413449#gid=224413449' target='_blank' rel='noopener noreferrer'>documented</a> and <a href='https://www.change.org/p/shut-down-mrdeepfakes-and-websites-dedicated-to-image-based-sexual-abuse' target='_blank' rel='noopener noreferrer'>campaigned against</a> hundreds of similar websites.</p>" },
    'dfcc': { role: "Proliferation & Discovery", roleLine: "Contributes to the proliferation and discovery of technologies used to non-consensually create and distribute AI-generated intimate images.", title: "Deepfake Creation Communities", body: "<p>Deepfake Creation Communities are online communities that provide general and technical assistance to members trying to create deepfakes. They are a “<a href='https://regmedia.co.uk/2019/10/08/deepfake_report.pdf' target='_blank' rel='noopener noreferrer'>key driving force</a> behind the increasing accessibility of deepfakes and deepfake creation software” and serve as an “entry point” for new users to learn from experienced users.</p><p>Historically, <a href='https://www.tsjournal.org/index.php/jots/article/view/126' target='_blank' rel='noopener noreferrer'>“deepfake creation communities”</a> have been large (reaching 100,000 members) and highly mobile (existing across platforms like Reddit, MrDeepFakes, 4chan, 8chan, Voat, Telegram, and Discord). In 2017, <a href='https://www.theverge.com/2018/2/7/16982046/reddit-deepfakes-ai-celebrity-face-swap-porn-community-ban' target='_blank' rel='noopener noreferrer'>journalists</a> uncovered “r/deepfakes” on Reddit, one of the earliest deepfake creation communities with over 90,000 subscribers that focused on face swapping celebrity faces with porn performers. In February 2018, under public pressure, Reddit <a href='https://www.reddit.com/r/announcements/comments/7vxzrb/update_on_sitewide_rules_regarding_involuntary/' target='_blank' rel='noopener noreferrer'>banned</a> “r/deepfakes” (and other threads like “r/CelebFakes”) and updated their site-wide rules “against involuntary pornography and sexual or suggestive content involving minors.” After the “r/deepfakes” ban, many members migrated to MrDeepFakes.com (MDF), the self-proclaimed “largest deepfake community,” which serves as <a href='https://arxiv.org/abs/2410.11100' target='_blank' rel='noopener noreferrer'>both</a> a deepfake video distribution and consumption site and a forum for deepfake content creators. MDF was also linked directly by the popular face-swap model “DeepFaceLab” on GitHub as a place to obtain <a href='https://www.tsjournal.org/index.php/jots/article/view/126' target='_blank' rel='noopener noreferrer'>technical support</a> to use the model. Most recently, <a href='https://www.404media.co/inside-the-telegram-channel-jailbreaking-grok-over-and-over-again/' target='_blank' rel='noopener noreferrer'>Telegram</a> has been a “deepfake creation community” for users using Grok AI to generate AIG-NCII.</p>" },
    'search-engines': { role: "Proliferation & Discovery", roleLine: "Contributes to the proliferation and discovery of technologies used to non-consensually create and distribute AI-generated intimate images.", title: "Search Engines", body: "<p>Search Engines enable the wide-spread discovery of AI nudifier apps, AIG-NCII, and distribution sites.</p><p>Independent researcher Genevieve Oh <a href='https://docs.google.com/spreadsheets/d/1vM-J_9NvOc4xHKbqqlZWzpQ0a0zsrDX-7Jx-wPn1hwg/edit?gid=224413449#gid=224413449' target='_blank' rel='noopener noreferrer'>conducted</a> 6000 google searches of 100 public figures (elected officials, broadcasters, TV hosts, singers, and chess players) and found that 99.69% of the searches for “NAME+DEEPFAKE” resulted in a “deepfake pornography” website result on the first page. Another <a href='https://www.isdglobal.org/digital_dispatches/the-ecosystem-of-nonconsensual-intimate-deepfake-tools-online/?ref=404media.co' target='_blank' rel='noopener noreferrer'>audit</a> found that queries for “deepnude,” “nudify,” and “undress app” on Google, Yahoo, and Bing all yielded at least one result leading the user to AI nudifier applications within the first 20 results.</p><p>In 2025, 47 state attorneys general <a href='https://www.naag.org/wp-content/uploads/2025/08/LTRS-Combined-Payment-and-Seach-Platform-FINAL.pdf' target='_blank' rel='noopener noreferrer'>wrote</a> an open letter to Google, Yahoo, and Microsoft urging them to block AIG-NCII content and creation tools from search engines. According to the letter, queries like “how to make deepfake pornography,” “undress apps,” “nudify apps,” or “deepfake porn” do not produce any warning labels. Instead, search engines “quickly present users with direct links to deepfake NCII, to listicles rating the top apps for creating deepfake NCII, and to apps that enable the creation of naked and/or sexual images and videos of any person in any photo.” The AGs call for search engines to “implement new policies that appreciate the threat of deepfake NCII by steering users away from harmful content and providing appropriate warnings.”</p>" },
    'ad-platforms': { role: "Proliferation & Discovery", roleLine: "Contributes to the proliferation and discovery of technologies used to non-consensually create and distribute AI-generated intimate images.", title: "Advertisement Platforms", body: "<p>Advertisement Platforms refer to platforms that enable organizations and individuals to place ads (specifically for AI nudifier apps) that drive massive traffic to these tools.</p><p>AI nudifier apps gain users by posting advertisements on large social media platforms. Investigative journalists at <a href='https://www.404media.co/instagram-advertises-nonconsensual-ai-nude-apps/' target='_blank' rel='noopener noreferrer'>404 Media</a> and the <a href='https://indicator.media/p/ai-nudifiers-continue-to-reach-millions-and-make-millions' target='_blank' rel='noopener noreferrer'>Indicator</a> have documented thousands of advertisements that AI nudifiers post on Instagram. A technical report from <a href='https://graphika.com/reports/a-revealing-picture' target='_blank' rel='noopener noreferrer'>Graphika</a> tracking 34 AI nudifier apps demonstrates how these apps “operate as a fully-fledged online industry” and rely on advertising on mainstream social media platforms and deploying customer referral schemes such as referral links on platforms like Reddit and X, allowing them to accumulate over 24 million unique visitors in September 2023. Graphika found a 2000% increase in referral links in one year during 2023.</p>" },
    'app-stores': { role: "Proliferation & Discovery", roleLine: "Contributes to the proliferation and discovery of technologies used to non-consensually create and distribute AI-generated intimate images.", title: "App Stores", body: "<p>App Stores are digital marketplaces for producers to upload and advertise apps and for consumers to discover and download apps. The National Center on Sexual Exploitation has previously <a href='https://endsexualexploitation.org/wp-content/uploads/Apple-App-Store-Notification-Letter_DDL-2023_FINAL.pdf' target='_blank' rel='noopener noreferrer'>called</a> out Apple and Google for their stores’ role promoting and facilitating sexual exploitation of children by allowing the discovery of inappropriate and potentially dangerous apps. Similarly, app stores enable the large-scale discovery and downloading of AI nudifier apps. According to <a href='https://www.bellingcat.com/news/uk-and-europe/2025/01/28/deepfake-porn-sites-link-to-tech-companies/' target='_blank' rel='noopener noreferrer'>Bellingcat</a>, DeepSwap, an app that was featured on the top of Mr.DeepFakes, was available to Google Play and Apple stores. With the most recent case of Grok, advocates have also <a href='https://www.wired.com/story/x-grok-app-store-nudify-csam-apple-google-content-moderation/' target='_blank' rel='noopener noreferrer'>critiqued</a> app stores for continuing to host Grok and X.</p>" },
    'dev-platforms': { role: "Infrastructural Support", roleLine: "Provides critical infrastructural support that allows technologies on the creation and distribution levels to function.", title: "Developer Platforms", body: "<p>Developer Platforms are platforms for developers to create, store, manage, and share code, including models and datasets.</p><p>Developer platforms are central to the development of open-source models and datasets that are used in the creation of deepfakes. <a href='https://endsexualexploitation.org/wp-content/uploads/Microsoft-GitHub-Notification-Letter_DDL-2023_FINAL.pdf' target='_blank' rel='noopener noreferrer'>Civil society organizations</a> and <a href='https://www.tandfonline.com/doi/full/10.1080/23268743.2019.1642794' target='_blank' rel='noopener noreferrer'>researchers</a> documented GitHub’s role in hosting early face-swap models like DeepFaceLab, DeepNude, and Unstable Diffusion that were used to produce AIG-NCII. AI-specific developer platforms like Hugging Face and Civitai are used to host open-weight models, such as pre-trained base models Stable Diffusion and Flux, as well as almost 35,000 fine-tuned “deepfake” <a href='https://arxiv.org/abs/2505.03859' target='_blank' rel='noopener noreferrer'>variants</a>, a majority of them sexual and signaling intent to produce non-consensual intimate images. An <a href='https://arxiv.org/abs/2505.04600' target='_blank' rel='noopener noreferrer'>audit</a> of Civitai also found that it was predominantly used to host “not-safe-for-work” (NSFW) models and datasets.</p>" },
    'critical-providers': { role: "Infrastructural Support", roleLine: "Provides critical infrastructural support that allows technologies on the creation and distribution levels to function.", title: "Critical Service Providers", body: "<p>Critical Service Providers, including cloud service providers, domain name services (DNS), and authentication services, are support software, enabling the existence of multiple pieces of the technological ecosystem, including nudifier apps and deepfake websites.</p><p>An Indicator <a href='https://indicator.media/p/ai-nudifiers-continue-to-reach-millions-and-make-millions' target='_blank' rel='noopener noreferrer'>audit</a> of 85 AI nudifier websites found that “Amazon and Cloudflare provide hosting or content delivery services for 62 of the 85 nudifiers” and “Google enabled simple sign-on for 53 out of 85.” On May 6, 2025, Mr.DeepFakes, the world’s most notorious “deepfake pornography” site with over 650,000 users <a href='https://www.npr.org/2025/05/06/nx-s1-5388422/mr-deepfakes-porn-site-ai-shut-down' target='_blank' rel='noopener noreferrer'>shut down</a> because an unknown “critical service provider terminated service permanently” and “data loss has made it impossible to continue operation.”</p>" },
    'payment-processors': { role: "Monetization", roleLine: "Enables the monetization of non-consensual creation and distribution of AI-generated intimate images.", title: "Payment Processors", body: "<p>Payment Processors (including credit cards and cryptocurrencies) enable the monetization of non-consensual creation and distribution of AI-generated intimate images. The <a href='https://indicator.media/p/ai-nudifiers-continue-to-reach-millions-and-make-millions' target='_blank' rel='noopener noreferrer'>Indicator</a> estimates the current AI nudifier economy of undressing apps to be over $36 million. According to <a href='https://www.tsjournal.org/index.php/jots/article/view/126' target='_blank' rel='noopener noreferrer'>researchers</a>, Mr.DeepFakes was used as an “actively growing deepfake market (primarily for people seeking to commission NSFW deepfake media).”</p><p>In 2025, 47 state attorneys general wrote an <a href='https://www.naag.org/wp-content/uploads/2025/08/LTRS-Combined-Payment-and-Seach-Platform-FINAL.pdf' target='_blank' rel='noopener noreferrer'>open letter</a> to Visa, Mastercard, American Express, PayPal, Google Pay, and Apple Pay stating “sellers of deepfake NCII tools and content have made their services available in exchange for fees paid via payment platforms...even including the logos of those companies on their webpages” and call for these companies to “deny sellers the ability to use their services when they are on notice of these connections but should be actively working to identify and remove any such sellers from their network.”</p>" },
  };

  /* ── build the SVG ─────────────────────────────────────── */
  const el = (name, attrs, parent) => {
    const n = document.createElementNS(NS, name);
    Object.entries(attrs || {}).forEach(([k, v]) => n.setAttribute(k, v));
    if (parent) parent.appendChild(n);
    return n;
  };

  const root = document.createElement('section');
  root.className = 'eco-graph';
  root.setAttribute('aria-label', 'Map of the technologies behind AI-generated non-consensual intimate images');
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'xMidYMid meet', class: 'eg-svg', role: 'group' }, root);
  mon.appendChild(root);

  /* legend and instruction */
  const legend = el('g', { class: 'eg-legend' }, svg);
  const lt = el('text', { x: 33, y: 52, class: 'eg-legend-title' }, legend); lt.textContent = 'Role of Technology in Facilitating AIG-NCII';
  const legendItems = [];
  [['Creation', 'creation'], ['Distribution', 'distribution'], ['Proliferation & Discovery', 'discovery'],
   ['Infrastructural Support', 'infra'], ['Monetization', 'money']].forEach(([label, role], i) => {
    const y = 95 + i * 39;
    const item = el('g', { class: 'eg-legend-item', tabindex: 0, role: 'button', 'aria-pressed': 'false', 'data-role': role,
      'aria-label': label + ': highlight the boxes with this role' }, legend);
    el('rect', { x: 25, y: y - 22, width: 380, height: 36, class: 'eg-legend-hit' }, item);
    el('rect', { x: 33, y: y - 17, width: 28, height: 28, fill: ROLE[role], class: 'eg-swatch' }, item);
    const t = el('text', { x: 80, y: y + 5, class: 'eg-legend-label' }, item); t.textContent = label;
    legendItems.push(item);
  });

  /* links go under the boxes */
  const edgeLayer = el('g', { class: 'eg-edges' }, svg);
  const edgeEls = EDGES.map((e) => {
    const g = el('g', { class: 'eg-edge' + (e.accent ? ' accent' : ''), 'data-a': e.a, 'data-b': e.b }, edgeLayer);
    el('path', { d: e.d, class: 'eg-line' }, g);
    (e.dots || []).forEach(([cx, cy]) => el('circle', { cx, cy, r: 8, class: 'eg-dot' }, g));
    if (e.head) {
      const [x, y, dir] = e.head;
      const pts = { down: `${x - 11},${y - 24} ${x + 11},${y - 24} ${x},${y}`, up: `${x - 11},${y + 24} ${x + 11},${y + 24} ${x},${y}`,
                    right: `${x - 24},${y - 11} ${x - 24},${y + 11} ${x},${y}` }[dir];
      el('polygon', { points: pts, class: 'eg-head' }, g);
    }
    return g;
  });

  /* boxes */
  const nodeLayer = el('g', { class: 'eg-nodes' }, svg);
  const nodeEls = NODES.map((n, i) => {
    const g = el('g', { class: 'eg-node', tabindex: 0, role: 'button', 'data-id': n.id, 'data-role': n.role, 'aria-label': n.title + ': open the note about this box' }, nodeLayer);
    el('rect', { x: n.x + 8, y: n.y + 8, width: n.w, height: n.h, class: 'eg-shadow' }, g);
    el('rect', { x: n.x, y: n.y, width: n.w, height: n.h, fill: ROLE[n.role], class: 'eg-box' }, g);
    const content = !n.tall ? el('g', { class: 'eg-content' }, g) : g;

    // Horizontal boxes use a left icon; middle boxes retain a centered stack.
    const cx = n.tall ? n.x + n.w / 2 : n.x + 72;
    if (!n.tall) {
      const icon = el('text', { x: n.x + 36, y: n.y + n.h / 2,
        class: 'eg-icon', 'text-anchor': 'middle', 'dominant-baseline': 'central',
        style: 'font-size:32px' }, content);
      icon.textContent = ICON[n.icon];
    }
    const rows = n.tall ? contentRows(n) : contentRows(n).slice(2);
    const contentHeight = rows.reduce((height, row) => height + row.height, 0);
    let y = n.y + (n.h - contentHeight) / 2;
    rows.forEach(row => {
      if (row.text) {
        const text = el('text', { x: cx, y: y + row.height / 2,
          class: row.className, 'text-anchor': n.tall ? 'middle' : 'start', 'dominant-baseline': 'central',
          style: `font-size:${row.size}px` }, content);
        text.textContent = row.text;
      }
      y += row.height;
    });
    g.style.setProperty('--i', i);
    return g;
  });

  function centerWideContent() {
    // Measure all labels before changing SVG geometry.
    const measured = NODES.flatMap((node, index) => {
      if (node.tall) return [];
      const content = nodeEls[index].querySelector('.eg-content');
      const texts = [...content.querySelectorAll('text:not(.eg-icon)')];
      const width = Math.max(...texts.map(text => text.getBBox().width));
      const title = content.querySelector('.eg-title');
      const icon = content.querySelector('.eg-icon');
      return [{ node, content, texts, width, title, icon, iconWidth: icon.getBBox().width }];
    });
    measured.forEach(({ node, texts, width, title, icon }) => {
      texts.forEach(text => {
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('x', node.x + 72 + width / 2);
      });
      icon.setAttribute('y', title.getAttribute('y'));
    });
    const iconPositions = measured.map(({ title, iconWidth }) => title.getBBox().x - 16 - iconWidth / 2);
    measured.forEach(({ icon }, index) => icon.setAttribute('x', iconPositions[index]));
    const offsets = measured.map(({ node, content }) => {
      const bounds = content.getBBox();
      return node.x + node.w / 2 - bounds.x - bounds.width / 2;
    });
    measured.forEach(({ content }, index) => content.setAttribute('transform', `translate(${offsets[index]} 0)`));
  }

  /* ── behaviour ─────────────────────────────────────────── */
  let selected = null;
  let activeRole = null;

  /* Clicking a legend row lights up every box with that role and dims the rest. */
  function setRoleFilter(role) {
    activeRole = role;
    root.classList.toggle('has-role', !!role);
    nodeEls.forEach((g) => g.classList.toggle('role-on', !!role && g.dataset.role === role));
    legendItems.forEach((item) => {
      const on = item.dataset.role === role;
      item.classList.toggle('on', on);
      item.setAttribute('aria-pressed', String(on));
    });
  }

  function select(id) {
    if (id && activeRole) setRoleFilter(null);
    selected = id;
    root.classList.toggle('has-selection', !!id);
    nodeEls.forEach(g => g.classList.toggle('active', g.dataset.id === id));
    const linked = new Set();
    edgeEls.forEach((g) => {
      const on = !!id && (g.dataset.a === id || g.dataset.b === id);
      g.classList.toggle('on', on);
      if (on) { linked.add(g.dataset.a); linked.add(g.dataset.b); }
    });
    nodeEls.forEach(g => g.classList.toggle('linked', linked.has(g.dataset.id) && g.dataset.id !== id));
  }

  /* The explanation opens in the Notes window, which is where the reader has been reading all along */
  function showInNotes(id) {
    const d = DETAILS[id];
    if (!d || !Eco.showNote) return;
    const doc = new DOMParser().parseFromString(d.body, 'text/html');
    const paras = Array.from(doc.body.children);
    const rich = !!Eco.richNotes;                            // the Research page shows the full entry with links; the story's Notes stay plain text
    const step = document.createElement('div');
    step.className = 'step step--k';
    step.dataset.nkey = 'node-' + id;
    const label = document.createElement('span'); label.className = 'step-label'; label.textContent = d.title;
    const det = document.createElement('div'); det.className = 'step-detail';
    let k;
    if (rich) {
      /* Title, then "Role in AIG-NCII" and "Description" sections, as on the ecosystem site */
      k = document.createElement('h4'); k.className = 'step-key-text'; k.textContent = 'Role in AIG-NCII: ' + d.role;
      const role = document.createElement('p'); role.textContent = d.roleLine; det.appendChild(role);
      const head = document.createElement('h4'); head.textContent = 'Description'; det.appendChild(head);
      paras.forEach((node) => { const p = document.createElement('p'); p.innerHTML = node.innerHTML.trim(); det.appendChild(p); });
    } else {
      const first = paras.find(p => p.tagName === 'P') || paras[0];
      const full = first.textContent.trim();
      const cut = /^(.+?[.!?])\s+(.*)$/s.exec(full);          // Notes show a short first sentence; the rest is behind "more"
      const key = cut ? cut[1] : full;
      const rest = [];
      paras.forEach((node, i) => {
        if (i === 0) return;
        if (node.tagName === 'UL') node.querySelectorAll('li').forEach(li => rest.push('• ' + li.textContent.trim()));
        else rest.push(node.textContent.trim());
      });
      if (cut && cut[2]) rest.unshift(cut[2]);
      k = document.createElement('p'); k.className = 'step-key-text'; k.textContent = key;
      rest.forEach((t) => { const p = document.createElement('p'); p.textContent = t; det.appendChild(p); });
    }
    step.append(label, k, det);
    Eco.showNote(step);
  }

  function open(id) {
    select(id);
    showInNotes(id);
  }

  nodeEls.forEach((g) => {
    Eco.onActivate(g, () => open(g.dataset.id));
    g.addEventListener('mouseenter', () => { if (!selected) root.dataset.hover = g.dataset.id; });
  });
  function showRole(role) {
    const d = ROLE_INFO[role];
    if (!d || !Eco.showNote) return;
    const step = document.createElement('div');
    step.className = 'step step--k';
    step.dataset.nkey = 'role-' + role;
    const label = document.createElement('span'); label.className = 'step-label'; label.textContent = d.title;
    const k = document.createElement('h4'); k.className = 'step-key-text'; k.textContent = 'Role in AIG-NCII';
    const det = document.createElement('div'); det.className = 'step-detail';
    const p = document.createElement('p'); p.textContent = d.text; det.appendChild(p);
    const h = document.createElement('h4'); h.textContent = d.tech.length > 1 ? 'Technologies in this role' : 'Technology in this role'; det.appendChild(h);
    d.tech.forEach((name) => { const li = document.createElement('p'); li.textContent = name; det.appendChild(li); });
    step.append(label, k, det);
    Eco.showNote(step);
  }
  function pickRole(role) {
    if (activeRole === role) { setRoleFilter(null); if (Eco.resetNote) Eco.resetNote(); return; }
    select(null);
    setRoleFilter(role);
    showRole(role);
  }
  legendItems.forEach((item) => Eco.onActivate(item, () => pickRole(item.dataset.role)));
  svg.addEventListener('click', (e) => { if (!e.target.closest('.eg-node')) select(null); });

  /* ── how much of it is showing (0 → 1), set by finale.js ── */
  const order = ['dev-platforms', 'search-engines', 'app-stores', 'ad-platforms', 'training-data', 'ai-models', 'ai-interfaces',
                 'dist-channels', 'dfcc', 'critical-providers', 'payment-processors'];
  Eco.graph = {
    centerWideContent,
    setProgress(p) {
      const shown = p > 0.02;
      root.classList.toggle('show', shown);
      root.classList.toggle('live', p >= 0.985);
      root.classList.toggle('legend-in', p > 0.08);
      nodeEls.forEach((g) => {
        const idx = order.indexOf(g.dataset.id);
        g.classList.toggle('in', p >= 0.12 + idx * 0.065);
      });
      root.classList.toggle('edges-in', p >= 0.86);
      if (p < 0.985 && selected) select(null);
    },
    select,
    clearRole: () => setRoleFilter(null),
  };
  // The law explorer shares the ecosystem geometry.
  Eco.graph.ext = { root, svg, el, NODES, nodeEls, edgeEls, select, ICON };
  return Eco.graph;
}

// Insert these fragments before initializing the story navigation.
export const stepsHtml = `    <div class="step step--n" data-fin="clear"></div>
    <div class="step step--k" data-fin="graph">
      <span class="step-label">One System</span>
      <p class="step-key-text">Behind all those windows is one connected system. Click any box to read what it does.</p>
      <button class="step-expand-btn" aria-expanded="false">Read more <i class="fas fa-chevron-down" aria-hidden="true"></i></button>
      <div class="step-detail" aria-hidden="true">
        <p>Redrawn from the paper’s map of the technologies that facilitate AI-generated non-consensual intimate images. Each box is a layer of technology, and the links show how they depend on one another.</p>
      </div>
    </div>
`;
export const dockHtml = `<div class="dt-dock-item dt-dock--neutral" title="Map" data-go="finale" data-step="[data-fin=&quot;graph&quot;]"><i class="fas fa-diagram-project"></i></div>`;
