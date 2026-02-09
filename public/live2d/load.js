/**
 * load.js - Live2D 看板娘核心引导脚本
 * 
 * 职责：
 * 1. 全局参数配置（模型列表、引流链接、交互文案）
 * 2. 环境检测与适配（移动端/PC端模型区分）
 * 3. 核心实例初始化与生命周期管理
 * 4. 模型个性化交互逻辑配置
 */

// ==========================================================================
// 1. 全局常量配置区
// ==========================================================================

// 引流链接池 - 点击看板娘触发的随机跳转链接
const DRAIN_LINKS = [
    "https://www.bilibili.com/video/BV1GJ411x7h7",
    // "http://121.40.180.251/sample-page/"
];

// PC 端模型列表
const MODELS_DESKTOP = [
    "/live2d/aolianfei/aolianfei.model3.json",
    "/live2d/bu/bu.model3.json",
    "/live2d/smallmita/smallmita.model3.json",
    "/live2d/MiTa/MiTa.model3.json",
    "/live2d/yang/yang.model3.json",
    "/live2d/37/37.model3.json",
    "/live2d/jane/jane.model3.json",
    "/live2d/Nicole/Nicole.model3.json",
    // "/live2d/vva/vva.model3.json",
];

// 移动端模型列表（轻量化或筛选）
const MODELS_MOBILE = [
    "/live2d/aolianfei/aolianfei.model3.json",
    "/live2d/bu/bu.model3.json",
    "/live2d/smallmita/smallmita.model3.json",
    "/live2d/MiTa/MiTa.model3.json",
    "/live2d/yang/yang.model3.json",
    "/live2d/37/37.model3.json",
];

// 基础交互文案配置
const INTERACTION_TEXTS = {
    welcome: ["Hi!"],
    touch: [
        "哎呀，不要逗我啦！",
        "我要生气了哦,哼~"
    ],
    skin: ["诶，想看看其他伙伴吗？", "替换后入场文本"],
    custom: [
        { selector: ".comment-form", text: "Content Tooltip" },
        { selector: ".home-social a:last-child", text: "Blog Tooltip" },
        { selector: ".list .postname", type: "read" },
        { selector: ".post-content a, .page-content a, .post a", type: "link" }
    ]
};

// ==========================================================================
// 2. 工具函数区
// ==========================================================================

/**
 * 检测当前设备是否为移动设备
 * 规则：UA包含移动端标识 或 屏幕宽度小于500px
 * @returns {boolean}
 */
function isMobileDevice() {
    const ua = window.navigator.userAgent.toLowerCase();
    const isMobileUA = ua.includes("mobile") || ua.includes("android") || ua.includes("ios");
    return window.innerWidth < 500 || isMobileUA;
}

/**
 * 获取并校验看板娘位置缓存
 * @returns {string} 'left' | 'right'
 */
function getPosterGirlPosition() {
    const cachePos = localStorage.getItem("posterGirlPosition");
    const isValid = cachePos === "left" || cachePos === "right";
    // 默认回退到全局定义的 pio_alignment
    const finalPos = isValid ? cachePos : pio_alignment;
    
    if (!isValid) {
        localStorage.setItem("posterGirlPosition", finalPos);
    }
    return finalPos;
}

// ==========================================================================
// 3. 核心配置对象
// ==========================================================================

const initConfig = {
    mode: "draggable", // 运行模式：draggable(可拖动) / fixed(固定定位) / static(静态)
    hidden: false,     // 初始状态：true(隐藏) / false(显示)
    content: {
        link: DRAIN_LINKS[Math.floor(Math.random() * DRAIN_LINKS.length)],
        welcome: INTERACTION_TEXTS.welcome,
        touch: [], // 基础点击交互文本（由 onModelLoad 动态填充）
        skin: INTERACTION_TEXTS.skin,
        custom: INTERACTION_TEXTS.custom
    },
    night: "toggleDarkmode()", // 夜间模式切换回调
    model: isMobileDevice() ? MODELS_MOBILE : MODELS_DESKTOP,
    tips: true,                // 是否开启气泡提示
    onModelLoad: onModelLoad   // 模型加载完成后的回调
};

// ==========================================================================
// 4. 初始化流程控制
// ==========================================================================

// 全局实例引用
let pio_reference;

/**
 * 主入口：资源加载完成后的初始化逻辑
 */
function Loading() {
    // 0. 动态创建 DOM 结构
    if (!document.querySelector(".pio-container")) {
        const container = document.createElement("div");
        container.className = "pio-container left";
        container.id = "pio-container";
        
        const action = document.createElement("div");
        action.className = "pio-action";
        container.appendChild(action);
        
        const canvas = document.createElement("canvas");
        canvas.id = "pio";
        canvas.width = 800;
        canvas.height = 1000;
        container.appendChild(canvas);
        
        document.body.appendChild(container);
    }

    console.group("%c [Pio] System Init ", "background:#3498db; color:white; border-radius:4px; padding:2px 6px;");
    console.log(`%c 运行模式: ${initConfig.mode} | 初始状态: ${initConfig.hidden ? '隐藏' : '显示'}`, "color:#34495e;");
    
    // 1. 同步位置配置
    pio_alignment = getPosterGirlPosition();
    
    // 2. 实例化核心控制器
    pio_reference = new Paul_Pio(initConfig);

    // 3. 样式修正与DOM同步
    pio_refresh_style();
    const cachePos = getPosterGirlPosition();
    const pioContainer = document.getElementById("pio-container");
    if (pioContainer) {
        pioContainer.classList.remove("left", "right");
        pioContainer.classList.add(cachePos);
    }

    console.log(`%c 实例就绪 | 对齐方式: ${pio_alignment}`, "color:#27ae60; font-weight:bold;");
    console.groupEnd();

    // 4. 移动端专属交互：点击外部自动收起操作栏
    if (isMobileDevice()) {
        document.addEventListener('click', (e) => {
            const container = document.getElementById("pio-container");
            if (container && !container.contains(e.target) && container.classList.contains("show-action")) {
                container.classList.remove("show-action");
            }
        });
    }
}

// ==========================================================================
// 5. 模型生命周期回调 (核心逻辑)
// ==========================================================================

/**
 * 模型加载完成回调
 * 负责：位置同步、个性化配置、交互事件绑定
 * @param {Object} model Live2D模型实例
 */
function onModelLoad(model) {
    // --- 阶段一：位置同步 ---
    const cachePos = getPosterGirlPosition();
    const pioContainer = document.getElementById("pio-container");
    pioContainer.classList.remove("left", "right");
    pioContainer.classList.add(cachePos);
    if (typeof pio_refresh_style === 'function') {
        pio_refresh_style();
    }
    
    console.groupCollapsed(`%c [Pio] Model Loaded: ${model.internalModel.settings.name} `, "color:#e67e22; font-weight:bold;");
    console.log(`位置已同步: ${cachePos}`);

    // --- 阶段二：获取核心组件 ---
    const canvas = document.getElementById("pio");
    const modelName = model.internalModel.settings.name;
    const coreModel = model.internalModel.coreModel;
    const motionManager = model.internalModel.motionManager;

    // --- 阶段三：初始化交互池 ---
    // 默认交互文本
    let touchList = [...INTERACTION_TEXTS.touch];

    /**
     * 内部助手：执行模型动作
     * @param {Object} action 动作配置 {text, motion, from, to}
     * @param {boolean} flag 是否强制显示气泡
     */
    function playAction(action, flag = false) {
        // 兼容纯文本（字符串）交互
        if (typeof action === 'string') {
            pio_reference.modules.render(action, flag);
            return;
        }

        if (action.text) {
            pio_reference.modules.render(action.text, flag);
        }
        if (action.motion) {
            pio_reference.model.motion(action.motion);
        }
        // 处理部件透明度过渡
        if (action.from && action.to) {
            Object.keys(action.from).forEach(id => {
                const idx = coreModel._partIds.indexOf(id);
                if (idx !== -1) {
                    TweenLite.to(coreModel._partOpacities, 0.6, { [idx]: action.from[id] });
                }
            });
            
            motionManager.once("motionFinish", () => {
                Object.keys(action.to).forEach(id => {
                    const idx = coreModel._partIds.indexOf(id);
                    if (idx !== -1) {
                        TweenLite.to(coreModel._partOpacities, 0.6, { [idx]: action.to[id] });
                    }
                });
            });
        }
    }

    // --- 阶段四：点击事件处理 ---
    function handleCanvasInteract(e) {
        e.stopPropagation();
        if (e.preventDefault) e.preventDefault();

        // 移动端：切换操作栏显示
        if (isMobileDevice()) {
            pioContainer.classList.toggle("show-action");
        }

        // 防抖：动作播放中不响应
        if (motionManager.isPlaying) return;
        
        // 随机触发交互
        const randomAction = pio_reference.modules.rand(touchList);
        playAction(randomAction);
    }
    
    canvas.onclick = handleCanvasInteract;
    canvas.ontouchend = handleCanvasInteract;

    // --- 阶段五：模型个性化配置 ---
    // 根据 modelName 配置专属语音和动作
    switch (modelName) {
        case "bu":
            pioContainer.dataset.model = "bu";
            initConfig.content.skin[1] = ["嗯呢~嗯呢呢~"];
            break;
            
        case "aolianfei":
            pioContainer.dataset.model = "aolianfei";
            initConfig.content.skin[1] = ["我是奥菲利娅，最后的赫尔卡星人"];
            break;
            
        case "yang":
            pioContainer.dataset.model = "yang";
            initConfig.content.skin[1] = ["我叫秧秧，一起抵达更远的地方吧！"];
            playAction({ motion: "x1" });
            break;
            
        case "vva":
            pioContainer.dataset.model = "vva";
            initConfig.content.skin[1] = ["我叫薇薇安，才，才不是你的粉丝呢！"];
            break;
            
        case "jane":
            pioContainer.dataset.model = "jane";
            initConfig.content.skin[1] = ["哼~终于等到你了"];
            break;
            
        case "Nicole":
            pioContainer.dataset.model = "Nicole";
            initConfig.content.skin[1] = ["明智之选！不过提前说好,我出场费可不低哦!"];
            break;
            
        case "smallmita":
            pioContainer.dataset.model = "smallmita";
            initConfig.content.skin[1] = ["我是小米塔，你可以留下来吗？"];
            touchList = [
                { text: "出bug了吗？", motion: "bug" },
                { text: "Wink~", motion: "wink" },
                { text: "不要离开我≧_≦", motion: "no" },
                { text: "你说什么？", motion: "ting" },
                { text: "好呀~", motion: "tap" },
            ];
            break;
            
        case "MiTa":
            pioContainer.dataset.model = "MiTa";
            initConfig.content.skin[1] = ["我是米塔，你想到哪里去？"];
            touchList = [
                { text: "一起来玩吧~", motion: "tap_1" },
                { text: "出bug了吗？", motion: "tap_2" },
                { text: "wink~", motion: "tap_3" },
            ];
            break;
            
        case "37":
            pioContainer.dataset.model = "37";
            initConfig.content.skin[1] = ["我是三月七~"];
            touchList = [
                { text: "欸~怎么啦", motion: "xf" }
            ];
            break;
            
        case "你的模型名字": // 预留模板
            pioContainer.dataset.model = "你的模型名字";
            initConfig.content.skin[1] = ["入场文本"];
            playAction({ text: "我是自定义模型，很高兴见到你！" }, true);
            break;
    }

    console.log("个性化配置已应用");
    console.groupEnd();

    // --- 阶段六：通用UI事件绑定 ---
    // 阻止功能按钮的事件冒泡，防止触发底层的拖拽或点击
    const allPioBtns = document.querySelectorAll('.pio-action span');
    allPioBtns.forEach(btn => {
        btn.addEventListener('mousedown', (e) => { e.stopPropagation(); e.preventDefault(); });
        btn.addEventListener('touchstart', (e) => { e.stopPropagation(); });
    });
}

// ==========================================================================
// 6. 启动
// ==========================================================================
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    Loading();
} else {
    window.addEventListener('load', Loading);
}
