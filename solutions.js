const translations = {
  zh: {
    pageTitle: "NORMECO 柔性机器人拧紧产线方案",
    metaDescription: "NORMECO 柔性机器人拧紧产线方案，将自动切换多工位套筒、工业机器人与拧紧轴组合为适用于多规格、多工位生产的自动化拧紧单元。",
    skipLink: "跳至主要内容", homeAria: "NORMECO 首页", navAria: "主导航", languageAria: "切换语言", languageMenuAria: "语言选择", menuAria: "打开菜单", mobileNavAria: "移动端导航",
    navHome: "首页", navProducts: "产品中心", navCustom: "定制服务", navSolutions: "产线方案", navAbout: "关于我们", navContact: "联系我们",
    heroTitle: "一套拧紧单元，<br>覆盖多规格、<br>多工位生产", heroLead: "自动切换多工位套筒、工业机器人与拧紧轴组成柔性拧紧单元。", viewProducts: "查看核心产品", viewApplications: "查看应用场景", principlesAria: "方案原则", principleOne: "自动换型", principleTwo: "多点覆盖", principleThree: "过程可控",
    heroFrameAria: "产线主视觉占位", heroFrameLabel: "主视觉占位 · 自动化拧紧单元", workingRadius: "工作半径", socketStationShort: "多工位套筒站", spindleShort: "拧紧轴", fixtureShort: "工件 / 工装", heroFrameCaption: "后续替换为真实产线图或运行视频。",
    sectionNavAria: "页面章节", pageIndex: "页面索引", indexChallenges: "生产难点", indexArchitecture: "整线架构", indexWorkflow: "工作流程", indexProducts: "核心产品", indexApplications: "应用场景", indexDelivery: "项目交付",
    challengeTitle: "柔性拧紧产线的关键难点", challengeLead: "围绕换型、点位覆盖和质量控制规划系统。", challengeOneTitle: "自动换型", challengeOneDesc: "多种螺栓规格需要快速、稳定地匹配对应套筒。", challengeTwoTitle: "复杂点位", challengeTwoDesc: "机器人需要覆盖分散、角度不同的拧紧位置。", challengeThreeTitle: "过程防错", challengeThreeDesc: "套筒确认、拧紧结果和异常处理需要统一控制。",
    architectureTitle: "三大核心产品，组成一套柔性拧紧系统", architectureLead: "点击右侧模块，可查看它在整线中的位置和职责。外围输送、定位和控制系统作为项目接口预留。", architectureFrameLabel: "整线架构占位 · 设备关系图", workpieceInput: "工件输入 / 定位", qualityOutput: "结果判断 / 放行", controlRail: "配方 · 防错 · 联锁 · 数据接口", socketTitle: "自动切换多工位套筒", socketRoleShort: "规格管理与换型", robotTitle: "工业机器人", robotRoleShort: "路径与点位覆盖", spindleTitle: "拧紧轴", spindleRoleShort: "执行拧紧程序", modulePanelNote: "当前为内容与交互占位，后续补充真实型号、参数和设备图。",
    socketDescription: "集中管理多种套筒，由机器人自动取放并确认到位。", socketPointOne: "多规格集中管理", socketPointTwo: "自动取放与防错", socketPointThree: "工位可按项目扩展",
    robotDescription: "按工件、点位、负载和节拍选型，覆盖多个位置与角度。", robotPointOne: "多位置、多角度作业", robotPointTwo: "程序化产品换型", robotPointThree: "按臂展与负载选型",
    spindleDescription: "执行拧紧程序，并向控制系统反馈结果。", spindlePointOne: "扭矩与角度控制", spindlePointTwo: "多段拧紧程序", spindlePointThree: "结果判断与异常反馈",
    workflowTitle: "六步完成一次自动拧紧循环", workflowLead: "流程用于说明控制关系，不代表固定节拍。每一步的检测条件和异常分支将在正式方案中补充。", flowOneTitle: "工件到位", flowOneDesc: "确认定位和产品型号", flowTwoTitle: "调用配方", flowTwoDesc: "读取点位、规格与程序", flowThreeTitle: "自动换套筒", flowThreeDesc: "取用对应规格并确认到位", flowFourTitle: "执行拧紧", flowFourDesc: "机器人按规划路径作业", flowFiveTitle: "质量判断", flowFiveDesc: "判断拧紧结果与异常", flowSixTitle: "继续或放行", flowSixDesc: "切换下一规格或完成循环",
    productsTitle: "三类核心产品", productsLead: "先明确设备职责，后续补充真实产品图和参数。", productImagePlaceholder: "产品视觉占位", socketMediaNote: "建议素材：套筒站整体图 + 机器人取放动作", robotMediaNote: "建议素材：机器人本体图 + 工作半径示意", spindleMediaNote: "建议素材：拧紧轴产品图 + 拧紧曲线界面",
    applicationsTitle: "典型应用场景", applicationsLead: "后续可替换为真实行业项目照片。", scenarioTabsAria: "应用场景", scenePlaceholder: "场景画面占位", scenarioOneTitle: "多型号混线生产", scenarioOneDesc: "不同产品共用一套柔性拧紧单元。", scenarioTwoTitle: "多规格螺栓装配", scenarioTwoDesc: "自动换套筒，连续完成不同规格点位。", scenarioThreeTitle: "大型结构件拧紧", scenarioThreeDesc: "机器人覆盖分散且角度复杂的拧紧位置。",
    valueTitle: "先表达可验证价值，不预设虚假数字", valueLead: "正式页面中的效率、节拍和节省比例，需要由真实项目数据支撑。当前先保留价值结构和数据位置。", valueOneTitle: "柔性生产", valueOneDesc: "适应不同产品、点位和紧固件规格。", valueTwoTitle: "自动换型", valueTwoDesc: "套筒、路径与程序按配方切换。", valueThreeTitle: "过程防错", valueThreeDesc: "将取放确认与拧紧判断纳入控制逻辑。", valueFourTitle: "空间集成", valueFourDesc: "在一个机器人单元中集中多个拧紧任务。", valueFiveTitle: "便于扩展", valueFiveDesc: "按项目增加套筒工位、程序或产品型号。", valueDataTitle: "项目数据位", valueDataDesc: "后续填写节拍、换型时间或案例结果。",
    deliveryTitle: "从工况分析到现场验收", deliveryLead: "把产线方案拆成清晰的工程阶段，让客户知道每一步需要确认什么、将获得什么。", deliveryOneTitle: "需求与工况分析", deliveryOneDesc: "确认工件、点位、紧固件、扭矩、节拍和现场边界。", deliveryTwoTitle: "布局与节拍规划", deliveryTwoDesc: "规划机器人可达性、设备位置、动作顺序和安全空间。", deliveryThreeTitle: "详细设计与集成", deliveryThreeDesc: "完成机械接口、电气控制、程序和外围系统衔接。", deliveryFourTitle: "调试、验收与支持", deliveryFourDesc: "验证动作、节拍、质量逻辑与异常处理，并完成交付。", contactTeam: "联系项目团队",
    closingTitle: "按实际工况规划拧紧单元", closingLead: "后续补充真实产品图、参数与项目案例。", contactTeam: "联系项目团队", browseProducts: "浏览产品中心", footerDesc: "NORMECO 专业装配工具标件与定制，总部位于中国重庆，为全球客户提供区域化销售支持。", footerPages: "页面", footerContact: "联系"
  },
  en: {
    pageTitle: "NORMECO Flexible Robotic Tightening Line Solutions",
    metaDescription: "NORMECO combines an automatic multi-station socket changer, industrial robots, and tightening spindles into flexible automated tightening cells.",
    skipLink: "Skip to main content", homeAria: "NORMECO home", navAria: "Primary navigation", languageAria: "Switch language", languageMenuAria: "Language selection", menuAria: "Open menu", mobileNavAria: "Mobile navigation",
    navHome: "Home", navProducts: "Products", navCustom: "Customization", navSolutions: "Line Solutions", navAbout: "About", navContact: "Contact",
    heroTitle: "One tightening cell<br>for multiple fastener types<br>and stations", heroLead: "An automatic socket changer, industrial robot, and tightening spindle form one flexible cell.", viewProducts: "View core products", viewApplications: "View applications", principlesAria: "Solution principles", principleOne: "Automatic changeover", principleTwo: "Multi-point reach", principleThree: "Controlled process",
    heroFrameAria: "Main production-line visual placeholder", heroFrameLabel: "Main visual placeholder · Automated tightening cell", workingRadius: "Working radius", socketStationShort: "Multi-station socket rack", spindleShort: "Spindle", fixtureShort: "Part / fixture", heroFrameCaption: "Replace later with a real line image or operating video.",
    sectionNavAria: "Page sections", pageIndex: "Page index", indexChallenges: "Challenges", indexArchitecture: "Architecture", indexWorkflow: "Workflow", indexProducts: "Core products", indexApplications: "Applications", indexDelivery: "Delivery",
    challengeTitle: "Key challenges in flexible tightening", challengeLead: "Plan around changeover, point coverage, and quality control.", challengeOneTitle: "Automatic changeover", challengeOneDesc: "Multiple fastener types need fast and reliable socket matching.", challengeTwoTitle: "Complex positions", challengeTwoDesc: "The robot must reach distributed tightening points at different angles.", challengeThreeTitle: "Process error-proofing", challengeThreeDesc: "Socket confirmation, tightening results, and exceptions require unified control.",
    architectureTitle: "Three core products form one flexible tightening system", architectureLead: "Select a module to see its place and role in the line. Conveying, positioning, and controls remain reserved project interfaces.", architectureFrameLabel: "Line architecture placeholder · Equipment relationship", workpieceInput: "Part input / positioning", qualityOutput: "Result / release", controlRail: "Recipe · Error-proofing · Interlock · Data interface", socketTitle: "Automatic multi-station socket changer", socketRoleShort: "Specification and changeover", robotTitle: "Industrial robot", robotRoleShort: "Path and position coverage", spindleTitle: "Tightening spindle", spindleRoleShort: "Execute tightening program", modulePanelNote: "Content and interaction placeholder. Real models, parameters, and equipment visuals will follow.",
    socketDescription: "Manages multiple sockets for automatic robot pick, place, and presence confirmation.", socketPointOne: "Central multi-socket management", socketPointTwo: "Automatic handling and error-proofing", socketPointThree: "Expandable stations",
    robotDescription: "Selected by part, position, payload, and cycle time to cover multiple angles.", robotPointOne: "Multi-position, multi-angle operation", robotPointTwo: "Program-based product changeover", robotPointThree: "Reach and payload-based selection",
    spindleDescription: "Executes tightening programs and returns results to the control system.", spindlePointOne: "Torque and angle control", spindlePointTwo: "Multi-stage programs", spindlePointThree: "Result and exception feedback",
    workflowTitle: "Six steps complete one automatic tightening cycle", workflowLead: "The sequence explains control relationships, not a fixed cycle time. Detection conditions and exception branches will be added to the engineered solution.", flowOneTitle: "Part in position", flowOneDesc: "Confirm positioning and product", flowTwoTitle: "Load recipe", flowTwoDesc: "Read positions, types, and programs", flowThreeTitle: "Change socket", flowThreeDesc: "Pick the right socket and confirm", flowFourTitle: "Tighten", flowFourDesc: "Robot follows the planned path", flowFiveTitle: "Quality decision", flowFiveDesc: "Evaluate result and exceptions", flowSixTitle: "Continue or release", flowSixDesc: "Change again or finish the cycle",
    productsTitle: "Three core products", productsLead: "Define each device role first; add real product visuals and specifications later.", productImagePlaceholder: "Product visual placeholder", socketMediaNote: "Suggested asset: complete rack + robot change motion", robotMediaNote: "Suggested asset: robot + working envelope", spindleMediaNote: "Suggested asset: spindle + tightening curve UI",
    applicationsTitle: "Typical applications", applicationsLead: "Replace later with real project photography.", scenarioTabsAria: "Application scenarios", scenePlaceholder: "Scene visual placeholder", scenarioOneTitle: "Mixed-model production", scenarioOneDesc: "Different products share one flexible tightening cell.", scenarioTwoTitle: "Multiple fastener types", scenarioTwoDesc: "Automatic socket changes cover different fastener positions.", scenarioThreeTitle: "Large structural parts", scenarioThreeDesc: "Robot reach covers distributed points at complex angles.",
    valueTitle: "Communicate verifiable value without invented numbers", valueLead: "Efficiency, cycle, and savings figures on the final page must come from real project evidence. This phase reserves the structure and data positions.", valueOneTitle: "Flexible production", valueOneDesc: "Adapt to different products, positions, and fasteners.", valueTwoTitle: "Automatic changeover", valueTwoDesc: "Switch sockets, paths, and programs by recipe.", valueThreeTitle: "Process error-proofing", valueThreeDesc: "Include pick confirmation and tightening evaluation in control logic.", valueFourTitle: "Spatial integration", valueFourDesc: "Concentrate several tightening tasks in one robot cell.", valueFiveTitle: "Expandable", valueFiveDesc: "Add socket stations, programs, or product models by project.", valueDataTitle: "Project data slot", valueDataDesc: "Add cycle, changeover time, or case results later.",
    deliveryTitle: "From operating analysis to site acceptance", deliveryLead: "Clear engineering stages show clients what must be confirmed and what each step delivers.", deliveryOneTitle: "Requirements and conditions", deliveryOneDesc: "Confirm part, positions, fasteners, torque, cycle, and site boundaries.", deliveryTwoTitle: "Layout and cycle planning", deliveryTwoDesc: "Plan reach, equipment positions, sequence, and safety space.", deliveryThreeTitle: "Detailed design and integration", deliveryThreeDesc: "Complete mechanical, electrical, software, and peripheral interfaces.", deliveryFourTitle: "Commissioning and acceptance", deliveryFourDesc: "Verify motion, cycle, quality logic, and exception handling before delivery.", contactTeam: "Contact the project team",
    closingTitle: "Plan the tightening cell around real conditions", closingLead: "Add real product visuals, specifications, and project cases next.", contactTeam: "Contact the project team", browseProducts: "Browse products", footerDesc: "NORMECO provides professional standard and custom assembly tools from Chongqing, China, with regional sales support for global customers.", footerPages: "Pages", footerContact: "Contact"
  }
};

const flags = {
  zh: ["https://flagcdn.com/w80/cn.png", "中国国旗"],
  en: ["https://flagcdn.com/w80/us.png", "United States flag"]
};

let currentLanguage = localStorage.getItem("normeco-language") === "en" ? "en" : "zh";
const currentFlag = document.getElementById("currentFlag");
const mobileMenuButton = document.getElementById("mobileMenuButton");
const mobileNav = document.getElementById("mobileNav");

function setLanguage(language) {
  currentLanguage = language;
  const dictionary = translations[language];
  document.documentElement.lang = language === "en" ? "en" : "zh-CN";
  document.title = dictionary.pageTitle;
  document.querySelector('meta[name="description"]').setAttribute("content", dictionary.metaDescription);
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const value = dictionary[element.dataset.i18n];
    if (value) element.textContent = value;
  });
  document.querySelectorAll("[data-i18n-html]").forEach((element) => {
    const value = dictionary[element.dataset.i18nHtml];
    if (value) element.innerHTML = value;
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
    const value = dictionary[element.dataset.i18nAriaLabel];
    if (value) element.setAttribute("aria-label", value);
  });
  document.querySelectorAll(".language-option").forEach((option) => option.setAttribute("aria-current", String(option.dataset.language === language)));
  currentFlag.src = flags[language][0];
  currentFlag.alt = flags[language][1];
  localStorage.setItem("normeco-language", language);
}

document.querySelectorAll(".language-option").forEach((option) => option.addEventListener("click", () => {
  setLanguage(option.dataset.language);
  option.blur();
}));

mobileMenuButton.addEventListener("click", () => {
  const open = mobileNav.classList.toggle("is-open");
  mobileMenuButton.setAttribute("aria-expanded", String(open));
});

mobileNav.addEventListener("click", () => {
  mobileNav.classList.remove("is-open");
  mobileMenuButton.setAttribute("aria-expanded", "false");
});

document.querySelectorAll(".scenario-tab").forEach((tab) => tab.addEventListener("click", () => {
  const scenario = tab.dataset.scenario;
  document.querySelectorAll(".scenario-tab").forEach((item) => {
    const selected = item === tab;
    item.classList.toggle("is-active", selected);
    item.setAttribute("aria-selected", String(selected));
  });
  document.querySelectorAll(".scenario-panel").forEach((panel) => {
    const selected = panel.id === `scenario-panel-${scenario}`;
    panel.classList.toggle("is-active", selected);
    panel.hidden = !selected;
  });
}));

const reveals = document.querySelectorAll(".reveal");
if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
  reveals.forEach((item) => item.classList.add("is-visible"));
} else {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: .12, rootMargin: "0px 0px -6% 0px" });
  reveals.forEach((item) => observer.observe(item));
}

setLanguage(currentLanguage);
