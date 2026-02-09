/**
 * pio_sdk4.js
 * 
 * Pio Live2D SDK2/3/4 通用适配脚本
 * 作者：jupiterbjy | 改造：journey-ad | 最后更新：2021.5.4
 * 
 * 功能职责：
 * 1. 适配 pixi-live2d-display 库，提供统一的模型加载接口 loadlive2d
 * 2. 管理 PIXI 应用实例与 Canvas 渲染画布
 * 3. 处理模型点击命中检测 (HitArea)
 * 4. 维护模型与容器的对齐样式
 * 
 * 依赖库：
 * - cubismcore
 * - live2d.min.js
 * - pixi.min.js
 * - pixi-live2d-display
 */

// ==========================================================================
// 1. 全局状态管理
// ==========================================================================

// 模型默认对齐方式：可选 'left' / 'right'
// 注意：外部修改此变量后，必须调用 pio_refresh_style() 才能生效
let pio_alignment = "left";

// Pixi 应用全局实例
let app;

// ==========================================================================
// 2. 核心适配接口
// ==========================================================================

/**
 * 加载 Live2D 模型（适配 Pio 框架）
 * 替代原生 loadlive2d 方法，基于 pixi-live2d-display 实现
 * 
 * @param {string} canvas_id - 渲染画布 DOM ID
 * @param {string|Object} json_object_or_url - 模型 JSON 配置对象或文件 URL
 * @param {Function} on_load - 模型加载完成后的回调函数，参数为 model 实例
 * @returns {PIXI.live2d.Live2DModel} Live2D 模型实例
 */
function loadlive2d(canvas_id, json_object_or_url, on_load) {
    console.groupCollapsed(`%c [Pio SDK] Loading Model... `, "color:#8e44ad; font-weight:bold;");
    
    // 1. 获取并重置画布
    const canvas = document.getElementById(canvas_id);
    
    // 修复：浏览器刷新/重载时 PIO 最小化导致 canvas 宽高为 0 的问题
    if (canvas.width === 0) {
        canvas.removeAttribute("height");
        pio_refresh_style();
    }

    // 2. 清理旧模型
    // 尝试移除舞台中已存在的上一个模型（通常是 index 0）
    try {
        if (app.stage.children.length > 0) {
            app.stage.removeChildAt(0);
        }
    } catch (error) {
        console.warn("[Pio SDK] 清理旧模型失败:", error);
    }

    // 3. 同步加载新模型
    let model;
    try {
        model = PIXI.live2d.Live2DModel.fromSync(json_object_or_url);
    } catch (e) {
        console.error("[Pio SDK] 模型创建失败:", e);
        return;
    }

    // 4. 绑定加载完成事件
    model.once("load", () => {
        console.log("%c 模型资源加载完毕 ", "color:#27ae60;");
        
        // 检查 app 是否可用
        if (!app || !app.stage) {
             console.error("[Pio SDK] PIXI App 未初始化，无法挂载模型");
             return;
        }

        // 添加到舞台
        app.stage.addChild(model);
        
        // 自动缩放：根据画布高度计算垂直缩放比例
        const vertical_factor = canvas.height / model.height;
        model.scale.set(vertical_factor);

        // 重置画布尺寸为模型实际渲染尺寸
        canvas.width = model.width;
        canvas.height = model.height;
        
        // 刷新对齐样式
        pio_refresh_style();

        // 设置模型水平位置 (基于缓存)
        const finalPos = _pio_get_cache_pos();
        model.x = finalPos === "left" ? 0 : canvas.width - model.width;

        // 绑定点击命中事件 (兼容 SDK 2/3/4)
        model.on("hit", hitAreas => {
            // SDK2 身体点击
            if (hitAreas.includes("body")) {
                console.log("[Pio SDK] Hit: body (SDK2)");
                model.motion('tap_body');
            }
            // SDK3/4 身体点击
            else if (hitAreas.includes("Body")) {
                console.log("[Pio SDK] Hit: Body (SDK3/4)");
                model.motion("Tap");
            }
            // 头部点击 (全版本兼容) -> 触发表情切换
            else if (hitAreas.includes("head") || hitAreas.includes("Head")) {
                console.log("[Pio SDK] Hit: Head");
                model.expression();
            }
        });

        // 执行回调
        if (typeof on_load === 'function') {
            on_load(model);
        }
        
        console.groupEnd();
    });

    return model;
}

/**
 * 刷新 PIO 容器样式
 * 场景：容器/画布尺寸变化、对齐方式切换
 * 逻辑：优先读取本地缓存的位置设置，兜底使用全局变量 pio_alignment
 */
function pio_refresh_style() {
    const pio_container = document.querySelector(".pio-container");
    if (!pio_container) return; 

    // 优先读取缓存的位置
    const finalPos = _pio_get_cache_pos(); 
    
    // 移除旧样式，添加新样式
    pio_container.classList.remove("left", "right"); 
    pio_container.classList.add(finalPos); 
}

// ==========================================================================
// 3. 内部辅助方法
// ==========================================================================

/**
 * 获取缓存中的对齐位置
 * 保证与 pio.js/load.js 规则一致，确保全局统一
 * @returns {string} 'left' | 'right'
 */
function _pio_get_cache_pos() {
    const cachePos = localStorage.getItem("posterGirlPosition");
    const isValid = cachePos === "left" || cachePos === "right";
    return isValid ? cachePos : pio_alignment;
}

/**
 * 初始化 PIO 页面容器结构
 * 动态创建 DOM 节点：容器 -> 操作区 + 画布
 */
function _pio_initialize_container() {
    if (document.getElementById("pio-container")) return;

    // 1. 主容器
    const pio_container = document.createElement("div");
    pio_container.className = "pio-container";
    pio_container.id = "pio-container";
    document.body.insertAdjacentElement("beforeend", pio_container);

    // 2. 操作区 (按钮组)
    const pio_action = document.createElement("div");
    pio_action.className = "pio-action";
    pio_container.insertAdjacentElement("beforeend", pio_action);

    // 3. 渲染画布
    const pio_canvas = document.createElement("canvas");
    pio_canvas.id = "pio";
    pio_container.insertAdjacentElement("beforeend", pio_canvas);

    console.log("%c [Pio SDK] Container Initialized ", "color:#2980b9; background:#ecf0f1; border-radius:3px;");
}

/**
 * 初始化 PIXI 应用
 * 必须在 PIO 核心逻辑初始化前执行
 */
function _pio_initialize_pixi() {
    // 构建 DOM 结构
    _pio_initialize_container();
    
    // 创建 PIXI 应用实例
    app = new PIXI.Application({
        view: document.getElementById("pio"),
        transparent: true, // 透明背景
        autoStart: true,   // 自动渲染
    });
    
    // 初始样式应用
    pio_refresh_style();
}

// ==========================================================================
// 4. 自动启动
// ==========================================================================

// DOM 加载完成后立即初始化环境
// 适配 Next.js/异步加载：如果 document.body 已存在，直接初始化，不再等待 DOMContentLoaded
if (document.body) {
    _pio_initialize_pixi();
} else {
    window.addEventListener("DOMContentLoaded", _pio_initialize_pixi);
}
