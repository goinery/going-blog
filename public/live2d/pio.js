/**
 * pio.js - Live2D 看板娘核心逻辑脚本
 * 
 * 开发信息：原作者 Dreamer-Paul | 二次开发 journey-ad
 * 开源协议：GPL 2.0 | 原作者博客：https://paugram.com
 * 
 * 核心功能：
 * 1. 状态管理：模型索引、显示/隐藏、对齐方向、拖拽状态
 * 2. 交互系统：气泡对话、动作触发、触摸反馈
 * 3. 运行模式：静态(static)、固定(fixed)、拖拽(draggable)
 * 4. 数据持久化：基于 localStorage 保存用户偏好
 */

var Paul_Pio = function (prop) {
    // 保持 this 引用，供内部闭包使用
    const that = this;
    
    // 拖拽状态标记
    let isActionDrag = false;

    // ==========================================================================
    // 1. 核心状态与 DOM 缓存
    // ==========================================================================
    const current = {
        idol: 0,                                                    // 当前模型索引
        menu: document.querySelector(".pio-container .pio-action"), // 功能菜单容器
        canvas: document.getElementById("pio"),                     // 渲染画布
        body: document.querySelector(".pio-container"),             // 主容器
        root: document.location.protocol + '//' + document.location.hostname + '/' // 站点根目录
    };

    // ==========================================================================
    // 2. 功能模块 (Modules)
    // ==========================================================================
    const modules = {
        // 渲染锁状态
        isRendering: false,
        
        // 触摸拖拽启用状态 (持久化)
        touchDragEnable: localStorage.getItem("posterGirlTouchDrag") === "true" || false,

        /**
         * 切换下一个模型索引
         * @returns {number} 新的模型索引
         */
        idol: function () {
            current.idol < prop.model.length - 1 ? current.idol++ : current.idol = 0;
            localStorage.setItem("posterGirlModel", current.idol);
            return current.idol;
        },

        /**
         * 创建 DOM 元素简写
         * @param {string} tag 标签名
         * @param {Object} attr 属性对象 (仅支持 class)
         * @returns {HTMLElement}
         */
        create: function (tag, attr) {
            const e = document.createElement(tag);
            if (attr.class) e.className = attr.class;
            return e;
        },

        /**
         * 随机获取数组元素
         * @param {Array} arr 
         * @returns {*}
         */
        rand: function (arr) {
            return arr[Math.floor(Math.random() * arr.length)];
        },

        /**
         * 渲染气泡对话
         * @param {string|Array} text 文本内容或文本数组
         * @param {boolean} flag 强制显示锁 (true=高优先级，期间屏蔽其他气泡)
         */
        render: function (text, flag = false) {
            if (this.isRendering) return;

            const content = Array.isArray(text) ? modules.rand(text) : text;
            dialog.innerHTML = content || "输入内容出现问题了 X_X";

            const duration = 4000;
            let unlockDuration = 0;

            if (flag) {
                this.isRendering = true;
                unlockDuration = 500; // 强制显示的冷却时间
            }

            dialog.classList.add("active");

            // 清理旧定时器
            if (this.t) clearTimeout(this.t);
            if (this.unlockTimer) clearTimeout(this.unlockTimer);

            // 设置隐藏定时器
            this.t = setTimeout(() => {
                dialog.classList.remove("active");
            }, duration);

            // 设置解锁定时器
            this.unlockTimer = setTimeout(() => {
                this.isRendering = false;
            }, unlockDuration);
        },

        /**
         * 销毁/隐藏看板娘
         */
        destroy: function () {
            that.initHidden();
            localStorage.setItem("posterGirl", 0);
        },

        /**
         * 移动端检测
         * @returns {boolean}
         */
        isMobile: function () {
            const ua = window.navigator.userAgent.toLowerCase();
            const isMobileUA = ua.includes("mobile") || ua.includes("android") || ua.includes("ios");
            return window.innerWidth < 500 || isMobileUA;
        },

        /**
         * 校验模型索引缓存
         * @returns {number} 合法索引
         */
        checkModelIndex: function () {
            const cacheIndex = localStorage.getItem("posterGirlModel");
            const numIndex = parseInt(cacheIndex);
            const isValid = !isNaN(numIndex) && numIndex >= 0 && numIndex < prop.model.length;
            
            const finalIndex = isValid ? numIndex : 0;
            if (!isValid) localStorage.setItem("posterGirlModel", 0);
            
            return finalIndex;
        },

        /**
         * 校验位置缓存
         * @returns {string} 'left' | 'right'
         */
        checkPosition: function () {
            const cachePos = localStorage.getItem("posterGirlPosition");
            const isValid = cachePos === "left" || cachePos === "right";
            // 兜底逻辑：优先使用全局变量，否则默认 right
            const defaultPos = (typeof pio_alignment === 'undefined') ? 'right' : pio_alignment;
            const finalPos = isValid ? cachePos : defaultPos;
            
            if (!isValid) localStorage.setItem("posterGirlPosition", finalPos);
            return finalPos;
        },

        /**
         * 更新位置缓存
         * @param {string} pos 
         */
        updatePosition: function (pos) {
            if (pos === "left" || pos === "right") {
                localStorage.setItem("posterGirlPosition", pos);
            }
        },

        /**
         * 切换移动端触摸拖拽状态
         */
        toggleTouchDrag: function() {
            this.touchDragEnable = !this.touchDragEnable;
            localStorage.setItem("posterGirlTouchDrag", this.touchDragEnable);
            
            const tip = this.touchDragEnable 
                ? "触摸拖拽已开启 <br/>可以拖动我啦~" 
                : "触摸拖拽已关闭 <br/>不能拖动我咯~";
            this.render(tip, true);

            // 动态绑定/解绑事件
            if(this.touchDragEnable) {
                current.body.ontouchstart = initDrag;
            } else {
                current.body.ontouchstart = null;
            }
        }
    };

    // 挂载 modules 到实例
    this.modules = modules;
    this.destroy = modules.destroy;

    // ==========================================================================
    // 3. 界面元素初始化
    // ==========================================================================
    const elements = {
        home: modules.create("span", { class: "pio-home" }),   // 首页
        skin: modules.create("span", { class: "pio-skin" }),   // 换肤
        info: modules.create("span", { class: "pio-info" }),   // 关于
        night: modules.create("span", { class: "pio-night" }), // 夜间模式
        tran: modules.create("span", { class: "pio-tran" }),   // 左右切换
        close: modules.create("span", { class: "pio-close" }), // 关闭
        show: modules.create("div", { class: "pio-show" }),    // 唤醒按钮
        touch: modules.create("span", { class: "pio-touch" })  // 拖拽开关 (Mobile)
    };

    const dialog = modules.create("div", { class: "pio-dialog" });
    current.body.appendChild(dialog);
    current.body.appendChild(elements.show);

    // ==========================================================================
    // 4. 交互逻辑 (Actions)
    // ==========================================================================
    const action = {
        /**
         * 欢迎语逻辑
         */
        welcome: function () {
            // 1. 外部来源欢迎
            if (document.referrer !== "" && document.referrer.indexOf(current.root) === -1) {
                const referrer = document.createElement('a');
                referrer.href = document.referrer;
                const domain = referrer.hostname;
                const text = prop.content.referer 
                    ? prop.content.referer.replace(/%t/, `“${domain}”`) 
                    : `欢迎来自 “${domain}” 的朋友！[关于]页面中有使用说明哦~`;
                modules.render(text, true);
            } 
            // 2. 站内时段欢迎
            else if (prop.tips) {
                const hour = new Date().getHours();
                let timeText = "[关于]页面中有使用说明哦~";
                // 此处可扩展分时段文案逻辑
                modules.render(timeText, true);
            } 
            // 3. 默认欢迎
            else {
                modules.render(prop.content.welcome || "欢迎来到本站！[关于]中有使用说明哦~", true);
            }
        },

        /**
         * 画布点击交互
         */
        touch: function () {
            current.canvas.onclick = function () {
                modules.render(prop.content.touch || ["你在干什么？", "再摸我就报警了！", "HENTAI!", "不可以这样欺负我啦！"]);
            };
        },

        /**
         * 按钮组功能绑定
         */
        buttons: function () {
            // [首页]
            elements.home.onclick = () => { location.href = current.root; };
            elements.home.onmouseover = () => { modules.render(prop.content.home || "点击这里回到首页！"); };
            current.menu.appendChild(elements.home);

            // [换肤] 多模型时显示
            if (prop.model.length > 1) {
                elements.skin.onclick = () => {
                    that.model = loadlive2d("pio", prop.model[modules.idol()], model => {
                        prop.onModelLoad && prop.onModelLoad(model);
                        modules.render(prop.content.skin?.[1] || "新衣服真漂亮~", true);
                    });
                    
                    // 切换模型时重置位置到角落
                    current.body.style.top = "";
                    current.body.style.left = "";
                    current.body.style.bottom = "";
                    current.body.style.right = "";
                };
                elements.skin.onmouseover = () => {
                    modules.render(prop.content.skin?.[0] || "想看看我的新衣服吗？");
                };
                current.menu.appendChild(elements.skin);
            }

            // [关于]
            elements.info.onclick = () => { window.open(prop.content.link || "https://paugram.com/coding/add-poster-girl-with-plugin.html"); };
            elements.info.onmouseover = () => { modules.render("想了解更多信息吗？"); };
            current.menu.appendChild(elements.info);

            // [夜间模式]
            if (prop.night) {
                elements.night.onclick = () => { eval(prop.night); };
                elements.night.onmouseover = () => { modules.render("夜间点击这里可以保护眼睛呢"); };
                current.menu.appendChild(elements.night);
            }

            // [位置切换]
            elements.tran.onclick = () => {
                const container = current.body;
                const winWidth = window.innerWidth;
                const containerWidth = container.offsetWidth;
                const offsetRight = -10; // 边距修正

                let newPos = "left";
                if (container.classList.contains("right")) {
                    container.classList.remove("right");
                    container.classList.add("left");
                    newPos = "left";
                } else {
                    container.classList.remove("left");
                    container.classList.add("right");
                    newPos = "right";
                }
                modules.updatePosition(newPos);

                // 动画修正逻辑：计算绝对位置实现平滑过渡
                container.style.right = "auto";
                let currentLeft = parseInt(container.style.left) || container.offsetLeft;
                const symmetryLeft = winWidth - containerWidth - currentLeft + offsetRight;
                container.style.left = symmetryLeft + "px";

                modules.render("诶，我过来了？好耶！<br/>ヾ(≧▽≦)ゝ", true);
            };
            elements.tran.onmouseover = () => { modules.render("点击切换左右位置~"); };
            current.menu.appendChild(elements.tran);

            // [触摸拖拽开关] 移动端专属
            if (modules.isMobile()) {
                elements.touch.onclick = () => { modules.toggleTouchDrag(); };
                elements.touch.onmouseover = () => {
                    const tip = modules.touchDragEnable 
                        ? "当前触摸拖拽：开启 ✅<br/>点击可关闭" 
                        : "当前触摸拖拽：关闭 ❌<br/>点击可开启";
                    modules.render(tip);
                };
                current.menu.appendChild(elements.touch);
            }

            // [关闭]
            elements.close.onclick = () => { modules.destroy(); };
            elements.close.onmouseover = () => { modules.render(prop.content.close || "QWQ 下次再见吧~"); };
            current.menu.appendChild(elements.close);
        },

        /**
         * 页面元素联动交互
         */
        custom: function () {
            if (!prop.content.custom) return;

            prop.content.custom.forEach(function (item) {
                const type = item.type || "default";
                const els = document.querySelectorAll(item.selector);
                
                if (els.length) {
                    els.forEach(el => {
                        el.onmouseover = function () {
                            if (type === "read") {
                                modules.render(`想阅读 “${this.innerText}” 吗？`);
                            } else if (type === "link") {
                                modules.render("想了解一下这篇文章吗？");
                            } else if (item.text) {
                                modules.render(item.text);
                            }
                        };
                    });
                }
            });
        }
    };

    // ==========================================================================
    // 5. 拖拽逻辑 (Global)
    // ==========================================================================
    
    /**
     * 显示模型逻辑
     */
    function showModel() {
        current.body.classList.remove("pio-hidden");
        localStorage.setItem("posterGirl", 1);
        current.idol = modules.checkModelIndex();
        
        // 恢复位置
        const cachePos = modules.checkPosition();
        current.body.classList.remove("left", "right");
        current.body.classList.add(cachePos);

        that.init(false);
    }

    /**
     * 拖拽事件处理器
     * 解决作用域丢失问题，直接使用 current.body
     */
    function initDrag(e) {
        // 重置拖拽状态
        isActionDrag = false;

        e.preventDefault();
        e.stopPropagation();

        const body = current.body;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        // 计算初始偏移
        const offset = {
            x: clientX - body.offsetLeft,
            y: clientY - body.offsetTop
        };

        function move(e) {
            e.preventDefault();
            e.stopPropagation();
            isActionDrag = true;
            
            const moveX = e.touches ? e.touches[0].clientX : e.clientX;
            const moveY = e.touches ? e.touches[0].clientY : e.clientY;
            
            let left = moveX - offset.x;
            let top = moveY - offset.y;

            // 边界限制
            const offsetTop = 30;
            const offsetRight = -10;
            const offsetBottom = 0;
            const offsetLeft = 0;

            const minLeft = offsetLeft;
            const minTop = offsetTop;
            const maxLeft = window.innerWidth - body.offsetWidth + offsetRight;
            const maxTop = window.innerHeight - body.offsetHeight + offsetBottom;

            left = Math.max(minLeft, Math.min(left, maxLeft));
            top = Math.max(minTop, Math.min(top, maxTop));

            body.style.left = left + 'px';
            body.style.top = top + 'px';
            body.style.right = "auto";
            body.style.bottom = "auto";
        }

        const moveEvent = e.touches ? 'touchmove' : 'mousemove';
        const endEvent = e.touches ? 'touchend' : 'mouseup';

        document.addEventListener(moveEvent, move);

        function endDrag() {
            body.classList.remove("active");
            document.removeEventListener(moveEvent, move);
            document.removeEventListener('mouseup', endDrag);
            document.removeEventListener('mouseleave', endDrag);
            document.removeEventListener('touchend', endDrag);
            document.removeEventListener('touchcancel', endDrag);

            // 如果是非拖拽点击且处于隐藏状态，触发显示
        if (!isActionDrag && body.classList.contains("pio-hidden")) {
            showModel();
        }
        }

        document.addEventListener('mouseup', endDrag);
        document.addEventListener('mouseleave', endDrag);
        document.addEventListener('touchend', endDrag);
        document.addEventListener('touchcancel', endDrag);
    }

    // ==========================================================================
    // 6. 运行模式策略
    // ==========================================================================
    const begin = {
        static: function () {
            current.body.classList.add("static");
        },
        fixed: function () {
            action.touch();
            action.buttons();
        },
        draggable: function () {
            action.touch();
            action.buttons();
            
            // PC端始终允许拖拽
            current.body.onmousedown = initDrag;
            
            // 移动端由开关控制 (见 toggleTouchDrag)
        }
    };

    // ==========================================================================
    // 7. 公共 API
    // ==========================================================================

    /**
     * 初始化显示
     * @param {boolean} onlyText 是否仅刷新文本
     */
    this.init = function (onlyText) {
        // 移动端隐藏状态下不初始化
        if (prop.hidden && modules.isMobile()) return;

        // 1. 恢复位置
        const cachePos = modules.checkPosition();
        current.body.classList.remove("left", "right");
        current.body.classList.add(cachePos);
        if (typeof pio_refresh_style === 'function') pio_refresh_style();

        // 2. 恢复移动端拖拽
        if (modules.isMobile() && modules.touchDragEnable) {
            current.body.ontouchstart = initDrag;
        } else {
            current.body.ontouchstart = null;
        }

        // 3. 加载模型
        if (!onlyText) {
            action.welcome();
            that.model = loadlive2d("pio", prop.model[current.idol], model => {
                prop.onModelLoad && prop.onModelLoad(model);
            });
        }

        // 4. 应用模式
        switch (prop.mode) {
            case "static": begin.static(); break;
            case "fixed": begin.fixed(); break;
            case "draggable": begin.draggable(); break;
            default: begin.fixed();
        }

        // 5. 绑定联动
        if (prop.content.custom) action.custom();
    };

    /**
     * 初始化隐藏状态
     */
    this.initHidden = function () {
        current.body.classList.add("pio-hidden");
        dialog.classList.remove("active");

        // [Fix] 确保在隐藏状态下也有正确的位置类名
        const cachePos = modules.checkPosition();
        current.body.classList.remove("left", "right");
        current.body.classList.add(cachePos);

        // 重置位置到角落
        current.body.style.top = "";
        current.body.style.left = "";
        current.body.style.bottom = "";
        current.body.style.right = "";

        // 绑定拖拽事件
        elements.show.onmousedown = initDrag;
        elements.show.ontouchstart = initDrag;
        
        // 移除点击事件，由 initDrag 处理
        elements.show.onclick = null;
    };

    // ==========================================================================
    // 8. 构造函数入口
    // ==========================================================================
    const posterGirlStatus = localStorage.getItem("posterGirl");
    
    // 逻辑调整：无缓存（首次访问）默认隐藏，只显示开启按钮
    if (posterGirlStatus === null) {
        localStorage.setItem("posterGirl", 0);
        this.initHidden();
    } 
    else if (posterGirlStatus === "0") {
        this.initHidden();
    } 
    else if (posterGirlStatus === "1") {
        current.idol = modules.checkModelIndex();
        this.init();
    }
};

// 版权信息
if (window.console && window.console.log) {
    console.log("%c Pio %c https://paugram.com ", "color: #fff; margin: 1em 0; padding: 5px 0; background: #673ab7;", "margin: 1em 0; padding: 5px 0; background: #efefef;");
}
