// ==UserScript==
// @name        DRRR点歌助手(drrr-music-helper)
// @description 让DRRR.COM聊天室支持点歌功能
// @namespace   Violentmonkey Scripts
// @match       https://drrr.com/*
// @license     MIT
// @require     https://fastly.jsdelivr.net/npm/layer-src@3.5.1/src/layer.min.js
// @resource    layerCss  https://fastly.jsdelivr.net/npm/layer-src@3.5.1/dist/theme/default/layer.min.css
// @unwrap
// @version     3.1.0
// @author      QQ:121610059
// @update      2023-06-06 14:02:31
// @supportURL  https://greasyfork.org/zh-CN/scripts/414535-drrr-com%E6%99%BA%E8%83%BD%E8%84%9A%E6%9C%AC-%E8%87%AA%E5%8A%A8%E5%AF%B9%E8%AF%9D-%E8%87%AA%E5%8A%A8%E7%82%B9%E6%AD%8C
// ==/UserScript==

// 定义全局变量
let lastRequestedSong = null // 外部创建一个变量来存储上一首点的歌曲信息
const userSongTimestamps = {}  // 外部创建一个对象来跟踪每个用户的点歌时间戳// 外部创建一个对象来跟踪每个用户的点歌时间戳
// 检测本地存储是否已经存在songList
if (!localStorage.getItem('songList')) {
    // 如果不存在，将数组中的数据设置为本地存储的songList
    localStorage.setItem('songList', JSON.stringify([
        '极乐净土',
        'aLIEZ',
        'only my railgun',
        '恋爱循环',
        '打上花火',
        '我的战争',
        '菲克瑟先生',
        'Lost in Paradise',
        'Under the tree',
        'Last stardust',
        '青鸟',
        '直到世界尽头'
    ]));
}

// 从本地存储中获取songList
let songList = JSON.parse(localStorage.getItem('songList'));
// 创建一个消息类型到处理函数的映射
const typeToHandler = {
    'join': handleJoin,
    'leave': handleLeave,
    'message': handleMessage,
    'music': handleMusic
}

// 添加全局事件监听器
$(document).ready(function () {
    // 初始化逻辑
    initialize()

    // 监听音乐播放状态
    musicPlaybackStatus()

    // 监控talks子元素数量不超过50，并以倒序方式移除超过指定数量的子元素。
    monitorTalksElement()

    // 添加 AJAX 请求监听器
    setupAjaxListeners()
})

// 初始化函数
function initialize() {

    // 创建并添加样式表
    createAndAppendStylesheet()

    // 当自动放歌功能打开时页面加载成功提示确认放歌
    showConfirmationDialog()

    // 创建设置按钮
    createAndAppendSettingsButton()

    // 设置按钮点击事件
    settingsButtonClick()
}

// 创建并添加样式表
function createAndAppendStylesheet() {
    // 创建一个link元素
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.type = 'text/css'
    link.href = 'https://fastly.jsdelivr.net/npm/layer-src@3.5.1/dist/theme/default/layer.min.css'

    // 将link元素附加到文档的head中
    document.head.appendChild(link)

    // 插入控制面板样式
    // 创建一个<style>元素
    var styleElement = document.createElement('style');

    // 在<style>元素中添加你的CSS样式
    styleElement.innerHTML = `body.stop-scrolling{overflow:auto!important;height:auto!important;}.sweet-overlay,.sweet-alert{display: none!important;}#tip{color: #000;}.settingContainer{width:100%;height:100%;background-color:rgb(77,189,60);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:1rem;box-sizing:border-box}.settingContainer button{background-color:#fff;border-radius:5px;border:1px solid #000;color:#000}.settingTiele{color:#fff;font-weight:bold;font-size:2rem;margin-bottom:1rem}.randomSongListsTextarea{display:flex;width:100%;justify-content:center}.randomSongListsTextarea textarea{width:100%}.panel{margin-top:1rem;display:flex;align-items:center;justify-content:space-between;width:100%}.panel .right{height:100%;color:#fff;display:flex;justify-content:center;align-items:center;padding:0 1rem;border:1px solid #fff;border-radius:5px;flex-direction:column-reverse}.panel .right .checkBox{margin:0 0.2rem;display:flex;align-items:center}.panel .right .checkBox label{margin-bottom:0}textarea{border:none;outline:none;padding:0;margin:0;-webkit-appearance:none;-moz-appearance:none;appearance:none;background-image:none;background-color:transparent;font-size:inherit;width:100%}textarea:focus{outline:none}.textarea{display:inline-block;resize:vertical;padding:5px 15px;line-height:1.5;box-sizing:border-box;color:#606266;background-color:#fff;border:1px solid #dcdfe6;border-radius:4px;transition:border-color 0.2s cubic-bezier(0.645,0.045,0.355,1)}.textarea::placeholder{color:#c0c4cc}.textarea:hover{border-color:#c0c4cc}.textarea:focus{border-color:#3677f0}.savebtn{color:#0099CC;background:transparent;border:2px solid #0099CC;border-radius:6px;border:none;color:white;padding:16px 32px;text-align:center;display:inline-block;font-size:16px;-webkit-transition-duration:0.4s;transition-duration:0.4s;cursor:pointer;text-decoration:none;text-transform:uppercase}.savebtn{background-color:white;color:black;border:2px solid #008CBA}.savebtn:hover{background-color:#000;color:white;border:1px solid #fff}@media screen and (min-width:769px){textarea.textarea,.panel{width:50%}}`;

    // 将<style>元素添加到页面的<head>部分
    document.head.appendChild(styleElement);
}

// 创建并添加设置按钮
function createAndAppendSettingsButton() {
    waitForElementToExist('#np',(element) => {
        element.style.position = 'relative' // 播放器设置相对定位
        const spanElement = document.createElement('span')  // 创建span标签插入
        spanElement.style.position = 'absolute'
        spanElement.style.right = '0px'
        spanElement.style.color = '#fff'
        spanElement.style.padding = '0 10px'
        spanElement.style.backgroundColor = '#4dbd3c'
        spanElement.textContent = '脚本设置'
        spanElement.id = 'settings'
        element.appendChild(spanElement)
    })
}

// 封装函数，页面加载完成确认自动放歌对话框
function showConfirmationDialog() {
    // 等待自动播放的歌曲加载
    setTimeout(() => {
        const autoChecked = localStorage.getItem("autoChecked") === "true";
        const isAutoPlayEnabled = window.location.href.includes("room/?id") && autoChecked && Player.isPausing;

        if (isAutoPlayEnabled) {
            // 判断是不是音乐房，只有在当前地址包含"room/?id"时才访问room.musicRoom
            if (room.musicRoom) {
                // 显示确认对话框
                let tip = layer.confirm('检测到自动点放歌功已开启，现在是否要播放随机歌曲？', {
                    title: '提示信息',
                    id: 'tip',
                    btn: ['需要', '不需要'] // 按钮
                }, function () {
                    layer.msg('准备播放随机歌曲');
                    autoSongRequest();   // 开始自动播放
                    layer.close(tip);    // 关闭提示框
                });
            } else {
                // 不是音乐房间，显示提示信息
                layer.alert('当前不是音乐房间，无法点歌。', {
                    shadeClose: true,
                    id: 'tip',
                    title: '提示信息'
                });
            }
        }
    }, 3000);
}

//  监控talks子元素数量，并以倒序方式移除超过指定数量的子元素。
function monitorTalksElement(maxElementCount = 50) {
    // 获取 #talks 元素
    const talksElement = document.querySelector('#talks');

    if (!talksElement) {
        return; // 如果找不到 #talks 元素，则退出函数
    }

    // 创建 MutationObserver 对象以监听子元素变化
    const observer = new MutationObserver(function (mutationsList) {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                const currentChildCount = talksElement.children.length;

                // 如果子元素数量超过指定的最大数量，倒序移除超出的元素
                if (currentChildCount > maxElementCount) {
                    const elementsToRemove = currentChildCount - maxElementCount;
                    for (let i = 0; i < elementsToRemove; i++) {
                        talksElement.removeChild(talksElement.lastElementChild); // 移除最后一个子元素
                    }
                }
            }
        }
    });

    // 开始监听 #talks 元素的子元素变化
    observer.observe(talksElement, { childList: true });
}

// 封装函数，用于创建设置窗口
function createSettingsWindow() {
    layer.open({
        title: '脚本设置',
        move: false,
        type: 1,
        offset: 'b',
        anim: 'slideUp',
        area: ['100%', '100%'],
        shade: 0.1,
        shadeClose: true,
        content: `
            <div class="settingContainer">
                <div class="settingTiele">设置随机歌单</div>
                <div class="randomSongListsTextarea">
                    <textarea class="textarea" rows="18"></textarea>
                </div>
                <div class="tips" style="margin-top: 1rem;color: #fff;">提示: 一行就是一首随机歌曲,自动放歌会从上面输入框中随机抽取一首歌进行搜索播放,修改后需保存!</div>
                <div class="panel">
                    <div class="left">
                        <button class="savebtn" id="save">保存歌单</button>
                    </div>
                    <a href="https://wpa.qq.com/msgrd?v=3&uin=1221610059&site=qq&menu=yes&jumpflag=1" target="_blank" style="text-decoration: none">反馈问题</a>
                    <div class="right">
                        <div class="checkBox"><input name="checkbox" type="checkbox" id="auto" value="1"><label for="auto">&nbsp自动放歌</label></div>
                        <div class="checkBox"><input name="checkbox2" type="checkbox" id="song" value="1"><label for="song">&nbsp自助点歌</label></div>
                    </div>
                </div>
            </div>`
    });

    // 返回设置窗口的 DOM 元素
    return document.querySelector('.randomSongListsTextarea textarea');
}

// 封装函数，用于监听保存按钮点击事件
function listenSaveButtonClick() {
    waitForElementToExist('#save', (element) => {
        element.addEventListener('click', () => {
            let songListTextarea = document.querySelector('.randomSongListsTextarea textarea');
            const newSongList = songListTextarea.value.split('\n').filter(item => item !== '');

            if (arraysAreEqual(newSongList, songList)) {
                logMessage('歌曲列表没有更改，无需保存', 'success');
                layer.msg('歌曲列表没有更改，无需保存');
            } else {
                localStorage.setItem('songList', JSON.stringify(newSongList));
                songList = newSongList;
                logMessage('保存成功', 'success');
                layer.msg('保存成功');
            }
        });
    });
}

// 封装函数，用于监听复选框变化事件
function listenCheckboxChange(autoCheckbox, message, successMessage, warningMessage, callback) {
    autoCheckbox.addEventListener("change", function () {
        const isChecked = this.checked; // 获取复选框状态
        localStorage.setItem(message, isChecked);
        if (this.checked) {
            layer.msg(successMessage);
            logMessage(successMessage, "success");

            if (typeof callback === "function") {
                callback();
            }

            // 在自助点歌功能开启时发送消息
            if (message === "songChecked") {
                sendMessage('自助点歌功能已开启,自助点歌格式为:点歌+歌名 或者  播放 + 歌名');
            }

            // 在自动放歌功能开启时触发提示并发送消息
            if (message === "autoChecked" && isChecked) {
                layer.msg('自动放歌功能已开启');
                logMessage("自动放歌功能已开启", "success");
                sendMessage('自动放歌功能已开启');
            }
        } else {
            layer.msg(warningMessage);
            logMessage(warningMessage, "warning");

            // 在自助点歌功能关闭时发送消息
            if (message === "songChecked") {
                sendMessage('自助点歌功能已关闭');
            }

            // 在自动放歌功能关闭时触发提示并发送消息
            if (message === "autoChecked" && !isChecked) {
                layer.msg('自动放歌功能已关闭');
                logMessage("自动放歌功能已关闭", "warning");
                sendMessage('自动放歌功能已关闭');
            }
        }
    });
}

// 设置按钮点击事件
function settingsButtonClick() {
    waitForElementToExist('#settings', (element) => {
        element.addEventListener('click', () => {
            const songListTextarea = createSettingsWindow();

            // 拼接歌曲列表显示到文本框中
            waitForElementToExist('.randomSongListsTextarea textarea', (element) => {
                element.value = songList.join('\n');
            });

            listenSaveButtonClick();

            // 获取复选框元素
            const autoCheckbox = document.getElementById("auto");
            const songCheckbox = document.getElementById("song");

            // 初始化本地存储值
            const autoChecked = localStorage.getItem("autoChecked") === "true";
            const songChecked = localStorage.getItem("songChecked") === "true";

            // 根据本地存储值设置复选框状态
            autoCheckbox.checked = autoChecked;
            songCheckbox.checked = songChecked;

            // 监听复选框变化事件
            listenCheckboxChange(
                autoCheckbox,
                "autoChecked",
                "自动放歌功能已开启",
                "自动放歌功能已关闭",
                () => {
                    if (Player.isPausing) {
                        autoSongRequest();
                    }
                }
            );

            listenCheckboxChange(
                songCheckbox,
                "songChecked",
                "自助点歌功能已开启",
                "自助点歌功能已关闭"
            );
        });
    });

    // 注册键盘保存事件
    document.addEventListener('keydown', function(event) {
        if (event.ctrlKey && (event.key === 's' || event.key === 'S')) {
            event.preventDefault();
            const specifiedElement = document.querySelector('.randomSongListsTextarea textarea');
            if (specifiedElement) {
                const save = document.querySelector('#save')
                save.click()
            }
        }
    });
}

// 检查两个数组是否相等
function arraysAreEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) {
        return false;
    }
    for (let i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) {
            return false;
        }
    }
    return true;
}

// 打印带有不同样式的消息。
function logMessage(message, messageType) {
    let color = "black"; // 默认为黑色文本

    // 根据消息类型设置颜色
    if (messageType === "success") {
        color = "green"; // 成功消息显示为绿色
    } else if (messageType === "error") {
        color = "red"; // 错误消息显示为红色
    } else if (messageType === "warning") {
        color = "orange"; // 警告消息显示为橙色
    }

    // 获取当前时间，并格式化为 [YYYY-M-D H:i:s] 格式
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0"); // 月份是从 0 开始的，所以要加 1
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    // 格式化时间
    const formattedTimestamp = `[${year}-${month}-${day} ${hours}:${minutes}:${seconds}]`;

    // 组合时间戳和消息文本
    const logText = `${formattedTimestamp} ${message}`;

    // 使用控制台打印带有样式的消息
    console.log(`%c${logText}`, `color: ${color}; font-weight: bold;`);
}

// 监听音乐播放状态
function musicPlaybackStatus() {

    // 音乐开始播放回调
    function onMusicStart(_this) {
        logMessage('音乐开始播放','success')
        _this.howl.seek(0)  // 从头开始播放
    }

    // 音乐播放结束回调
    function onMusicEnd(_this) {
        logMessage('音乐播放结束', 'success');

        // 检查本地存储值 autoChecked
        const autoChecked = localStorage.getItem("autoChecked") === "true";

        if (autoChecked) {
            // 如果自动点歌功能已启用，执行自动点歌逻辑
            autoSongRequest();
        } else {
            // 如果自动点歌功能未启用，显示提示信息
            logMessage("自助点歌功能未启用", 'warning');
        }
    }

    // hook 音乐播放状态
    MusicItem = function() {
        function e(n) {
            var r = this;
            _classCallCheck(this, e),
                this.music = n,
                console.log(n)
                this.name = DRRRClientBehavior.literalMusicTitle(n),
                this.url = n.playURL,
                this.schedule = null;
            var o = function() {
                r._unschedule_progress_update(100),
                visualizerEnabled && visualizer.stop(),
                    Player.isPausing = !0,
                    $(document).trigger("music-end", r)
            }
                , i = function() {
                r._unschedule_progress_update(100 * r.percent())
            }
                , a = function() {
                r._schedule_progress_update()
            }
                , s = function() {
                r._unschedule_progress_update()
            };

            const originalOnPlay = a;
            const originalOnStop = o;

            "apple_music" == n.source ? this.howl = new AppleMusicBackend(n,{
                autoplay: !1,
                onend: () => {
                    onMusicEnd(this); // 直接调用全局的 onMusicEnd 函数，并传递当前对象（this）
                    originalOnStop(); // 执行原始的 onstop
                },
                onpause: i,
                onplay: () => {
                    onMusicStart(this); // 直接调用全局的 onMusicStart 函数，并传递当前对象（this）
                    originalOnPlay(); // 执行原始的 onplay
                },
                onstop: s,
            }) : this.howl = new Howl({
                autoplay: !1,
                src: [this.url],
                html5: !0,
                volume: visualizerEnabled ? 1 : Player.volume,
                onload: function() {
                    visualizerEnabled && visualizer.play(r._sounds[0]._node)
                },
                onend: () => {
                    onMusicEnd(this); // 直接调用全局的 onMusicEnd 函数，并传递当前对象（this）
                    originalOnStop(); // 执行原始的 onstop
                },
                onpause: i,
                onplay: () => {
                    onMusicStart(this); // 直接调用全局的 onMusicStart 函数，并传递当前对象（this）
                    originalOnPlay(); // 执行原始的 onplay
                },
                onstop: s,
                onloaderror: function(e, n) {
                    if (r._unschedule_progress_update(),
                    "No audio support." != n && ("No codec support for selected audio sources." != n || -1 === r.url.indexOf(visualizerUrlPrefix))) {
                        switch (n = n || "Unknown") {
                            case 1:
                                n = "fetching process aborted by user";
                                break;
                            case 2:
                                n = "error occurred when downloading";
                                break;
                            case 3:
                                n = "error occurred when decoding";
                                break;
                            case 4:
                                n = "URL is incorrect or audio/video not supported"
                        }
                        visualizerEnabled && visualizer.stop(),
                            swal(t("Music: "), t("Audio cannot be loaded: {1}", r.name) + "\n\n" + t("Error: {1}", n), "warning")
                    }
                },
                onplayerror: function() {
                    r.howl.once("unlock", function() {
                        r.howl.play()
                    })
                }
            })
        }
        return _createClass(e, [{
            key: "volume",
            value: function(e) {
                this.howl.volume(e)
            }
        }, {
            key: "_schedule_progress_update",
            value: function() {
                var e = this;
                $(document).trigger("music-start", this),
                    $(document).trigger("music-update-percent", 100 * this.percent()),
                    this.schedule = setInterval(function() {
                        $(document).trigger("music-update-percent", 100 * e.percent())
                    }, 950)
            }
        }, {
            key: "_unschedule_progress_update",
            value: function() {
                var e = arguments.length > 0 && void 0 !== arguments[0] ? arguments[0] : 0;
                $(document).trigger("music-stop"),
                    clearInterval(this.schedule),
                !1 !== e && $(document).trigger("music-update-percent", e)
            }
        }, {
            key: "now",
            value: function() {
                return this.howl.seek()
            }
        }, {
            key: "setTime",
            value: function(e) {
                var t = this
                    , n = new Date;
                0 == this.duration() ? this.howl.once("play", function() {
                    var r = (new Date - n) / 1e3;
                    t.howl.seek(e + r)
                }) : e <= this.duration() ? this.howl.seek(e) : this.howl.stop()
            }
        }, {
            key: "duration",
            value: function() {
                return this.howl.duration()
            }
        }, {
            key: "percent",
            value: function() {
                return this.now() / this.duration()
            }
        }, {
            key: "play",
            value: function() {
                $(document).trigger("music-play", this),
                    Player.nowPlaying = this,
                this instanceof Howl && this.stopOthers(),
                    this.howl.play(),
                    Player.isPausing = !1,
                visualizerEnabled && visualizer.resume()
            }
        }, {
            key: "stopOthers",
            value: function() {
                var e = this;
                Player.playList.forEach(function(t) {
                    t !== e && null != t && null != t.howl && t.stop()
                })
            }
        }, {
            key: "pause",
            value: function() {
                this.howl.pause(),
                visualizerEnabled && visualizer.pause(),
                    Player.isPausing = !0
            }
        }, {
            key: "stop",
            value: function() {
                Player.isPausing = !0,
                    this.howl.stop()
            }
        }, {
            key: "unload",
            value: function() {
                clearInterval(this.schedule),
                    this.howl.unload()
            }
        }, {
            key: "previewOnly",
            get: function() {
                return "apple_music" == this.music.source && this.howl.previewOnly
            }
        }, {
            key: "time",
            get: function() {
                return this.now()
            }
        }, {
            key: "music_object",
            get: function() {
                return this.music
            }
        }]),
            e
    }();

}

//  设置 AJAX 请求监听器
function setupAjaxListeners() {
    // 在每个 AJAX 请求成功完成后执行的拦截器
    $(document).ajaxSuccess(function(event, xhr, settings) {
        // 检查请求的类型是否为 GET 且请求的 URL 包含 "update"
        if (settings.type === 'GET' && settings.url.includes('update')) {
            try {
                // 解析响应数据为 JSON 对象
                const responseData = JSON.parse(xhr.responseText)

                // 检查是否有名为 "talks" 的属性，且它是一个数组且不为空
                if (Array.isArray(responseData.talks) && responseData.talks.length > 0) {
                    // 访问 "talks" 数组并遍历其中的元素
                    const talksArray = responseData.talks
                    logMessage('请求最新消息完成。最新消息:','success')
                    talksArray.forEach(talk => {
                        // 根据 "type" 属性调用相应的处理函数
                        const handler = typeToHandler[talk.type]
                        if (handler) {
                            handler(talk)
                        } else {
                            logMessage(`未知类型: ${talk.type}`,'warning')
                        }
                    })
                }
            } catch (error) {
                logMessage(`无法解析 JSON 响应数据: ${error}`, 'error' )
            }
        }
    })
    // 添加全局 AJAX 发送前事件监听器
    $(document).ajaxSend(function(event, xhr, settings) {
        // 检查请求类型是否为 POST 且请求的 URL 包含 "ajax"
        if (settings.type === 'POST' && settings.url.includes('ajax')) {
            // 获取请求数据
            const requestDatas = settings.data

            // 检查 requestData 是否包含 "message"
            if (requestDatas.includes('message')) {
                // 如果包含 "message"，继续检查是否同时包含 "url" 和 "to"
                if (requestDatas.includes('url') && requestDatas.includes('to')) {
                    logMessage('用户主动通过表单发送消息', 'success')
                } else {
                    logMessage('脚本自动处理发送消息', 'success')
                    let name = localStorage.username  // 获取本地用户名
                    // 使用 URLSearchParams 来解析
                    const params = new URLSearchParams(requestDatas)
                    // 获取键值对
                    const requestData = {}
                    for (const [key, value] of params) {
                        requestData[key] = value
                    }
                    // 插入本地消息
                    const talks = document.getElementById('talks')
                    const icon = profile.icon
                    const div = `
                    <dl class="talk ${icon}">
                        <dt class="dropdown user">
                            <div class="avatar avatar-${icon}"></div>
                            <div class="name" data-toggle="dropdown">
                                <span class="select-text">${name}</span>
                            </div>
                            <ul class="dropdown-menu" role="menu"></ul>
                        </dt>
                        <dd>
                            <div class="bubble">
                                <div class="tail-wrap center" style="background-size: 65px">
                                    <div class="tail-mask"></div>
                                </div>
                                <p class="body select-text">${requestData.message}</p>
                            </div>
                        </dd>
                    </dl>
                `

                    setTimeout(function(){  // 延迟1.5秒插入本地消息
                        talks.insertAdjacentHTML("afterbegin", div)
                    }, 1500 )
                }
            }
        }
    })
}

// 定义一个函数，用于等待指定元素出现
function waitForElementToExist(selector, callback) {
    const interval = setInterval(() => {
        // 检查是否存在指定选择器的元素
        const element = document.querySelector(selector)
        if (element) {
            clearInterval(interval) // 停止轮询
            callback(element) // 调用回调函数并传递找到的元素
        }
    }, 100) // 每100毫秒检查一次
}

// 自动点歌逻辑
function autoSongRequest() {

    if (songList.length > 0) {

        // 随机选择一个歌曲
        const randomIndex = Math.floor(Math.random() * songList.length)

        // 点歌选定的歌曲
        const selectedSongName = songList[randomIndex]

        // 使用 getSongInfo 函数来获取歌曲的URL
        getSongInfo(selectedSongName, function(url, songName) {
            // 在成功回调函数中点歌
            logMessage(`自动点歌: ${songName}`, 'success')
            sendMusicRequest(url, songName)
        }, function(errorMessage) {
            logMessage('自动点歌失败:', 'error')
            console.log(errorMessage)
        })
    } else {
        logMessage('歌曲列表为空，无法自动点歌。', 'error')
    }
}

// 自定义处理点歌请求的函数
function handleSongRequest(songRequest, name, id) {

    // 当前不是音乐房间就返回提示信息
    if (!room.music){
        sendMessage('当前不是音乐房间，无法点歌。')
        logMessage('当前不是音乐房间，无法点歌。', 'error')
        return
    }

    // 检查当前这首点的歌曲是否与上一首不一样
    if (lastRequestedSong === songRequest) {
        // 上一首点的歌曲与当前这首一样，触发错误提示
        logMessage('上一首点的歌曲与当前这首相同，忽略点歌。', 'warning')
        //  发送消息提示用户
        sendMessage('上一首点的歌曲与当前这首相同，请选择其他歌曲。')
        return
    }

    // 获取当前时间戳
    const currentTime = Date.now()
    // 定义秒数限制，例如设置为 30 秒
    const songRequestLimitInSeconds = 1
    // 设置点歌频率的秒数限制
    const songRequestLimit = songRequestLimitInSeconds * 1000 // 将秒数转换为毫秒

    // 检查用户是否在指定秒数内重复点歌
    if (userSongTimestamps[id] && currentTime - userSongTimestamps[id] < songRequestLimit) {
        // 用户在指定秒数内重复点歌，触发错误提示
        logMessage('@' + name + ' 点歌的频率太高，请稍后再试。限制时间：' + songRequestLimitInSeconds + '秒','warning')
        // 发送消息提示用户
        sendMessage('@' + name + ' 点歌的频率太高，请稍后再试。限制时间：' + songRequestLimitInSeconds + '秒')
        return
    }

    // 更新用户的点歌时间戳
    userSongTimestamps[id] = currentTime

    // 更新上一首点的歌曲信息
    lastRequestedSong = songRequest

    // 在这里执行你的点歌处理逻辑
    logMessage(`收到点歌请求: ${songRequest}`, 'success')

    // 定义一个处理成功地回调函数
    function onSuccess(url, songName) {
        logMessage(`成功获取歌曲 URL: ${url}`, 'success')
        logMessage(`歌曲名称: ${songName}`, 'success')
        // 在这里执行你的进一步操作，比如发送音乐请求
        sendMusicRequest(url, songName)
    }

    // 定义一个处理失败的回调函数
    function onError(errorMessage) {
        logMessage('获取歌曲 URL 失败:', 'error')
        console.log(errorMessage)
        // 在这里执行你的错误处理逻辑
        sendMessage('获取歌曲 URL 失败, 请稍后再试。')
    }

    // 示发送请求获取歌曲信息
    getSongInfo(songRequest, onSuccess, onError)
}

// 发送音乐消息
function sendMusicRequest(url, name) {
    // 创建请求的数据对象
    const requestData = {
        music: 'music',
        url: url,
        name: name
    }

    // 发送 POST 请求
    $.post('/room/?ajax=1', requestData, function(responseData) {
        if (!responseData) {
            // 响应为空，发送音乐成功
            logMessage('发送音乐成功！','success')
        } else if (responseData === '慢一点，你发送得太快了！') {
            // 响应为 '慢一点，你发送得太快了！'，等待2秒后重新发送
            logMessage('发送音乐过快，等待3秒后重新发送...', 'warning')
            setTimeout(function() {
                sendMusicRequest(url, name) // 重新发送音乐请求
            }, 3000) // 等待3秒
        }
    }).fail(function(error) {
        // 处理请求失败的情况
        logMessage('发送音乐请求失败:','error')
        console.log(error)
    })
}

// 发送消息
function sendMessage(message) {
    // 创建包含消息数据的对象
    let dataToSend = {
        message: message
    }

    // 发送 POST 请求
    $.ajax({
        type: "POST",
        url: "/room/?ajax=1",
        data: dataToSend,
        success: function(response) {
            // 请求成功的处理
            if (response === "") {
                // 响应为空，表示发送消息成功
                logMessage("消息发送成功！", 'success')
            } else {
                // 响应不为空，可能包含错误信息或其他内容
                logMessage("消息发送失败，响应内容：",'error')
                console.log(response)
            }
        },
        error: function(jqXHR, textStatus) {
            // 请求失败的处理
            logMessage("消息发送失败，错误信息：",'error')
            console.log(textStatus)
        }
    })
}

// 通过关键词获取音乐url
function getSongInfo(keyword, successCallback, errorCallback) {
    if (keyword === "") return  //关键词为空，不发送请求
    // 第一次请求，获取歌曲信息数组
    $.get(`https://kwapi-api-iobiovqpvk.cn-beijing.fcapp.run/search?pn=1&key=${keyword}`, function(responseData) {
        // 解析响应数据为 JSON 格式
        const responseJSON = JSON.parse(responseData)

        // 检查是否是数组以及是否有数据
        if (Array.isArray(responseJSON) && responseJSON.length > 0) {
            // 获取数组中第一条数据的 rid 和歌曲信息
            const firstSong = responseJSON[0]
            const firstSongRid = firstSong.rid

            // 构建歌曲名称（以name和artist拼接）
            const songName = `${firstSong.name} - ${firstSong.artist}`

            // 第二次请求，获取歌曲 URL
            $.get(`https://kwapi-api-iobiovqpvk.cn-beijing.fcapp.run/mp3?rid=${firstSongRid}`, function(urlData) {
                // 检查是否成功获取歌曲 URL
                if (urlData) {
                    urlData = replaceDomain(urlData)  // 替换域名支持https
                    successCallback(urlData, songName) // 调用成功回调函数并传递 URL 和歌曲名称
                } else {
                    errorCallback('无法获取歌曲 URL') // 调用错误回调函数
                }
            }).fail(function() {
                // 请求第二次失败时，重新执行 getSongInfo 并带上参数
                setTimeout(function(){
                    getSongInfo(keyword, successCallback, errorCallback);
                },5000)
            })
        } else {
            logMessage('无法获取歌曲信息数组或数组为空','error')
            errorCallback('无法获取歌曲信息数组或数组为空') // 调用错误回调函数
            sendMessage('未搜索到相关歌曲信息')   // 给用户发送提示
        }
    }).fail(function(error) {
        logMessage('获取歌曲信息数组失败:', 'error')
        console.log(error)
        errorCallback('获取歌曲信息数组失败') // 调用错误回调函数
        // 请求第一次失败时，重新执行 getSongInfo 并带上参数
        setTimeout(function(){
            getSongInfo(keyword, successCallback, errorCallback);
        },5000)
    })
}

// 替换酷我域名支持https
function replaceDomain(url) {
    // 使用正则表达式替换规则
    return url.replace(/http:\/\/([^\/]+)\.sycdn\.kuwo\.cn/g, function (match, p1) {
        let parts = p1.split('.')
        if (parts.length >= 3) {
            return 'https://' + parts.join('-') + '-sycdn.kuwo.cn'
        } else {
            return 'https://' + p1 + '-sycdn.kuwo.cn'
        }
    })
}

// 处理加入类型的函数
function handleJoin(talk) {
    logMessage('处理加入:', 'success' )
    console.log(talk)
    // 在这里执行处理加入的操作
}

// 处理离开类型的函数
function handleLeave(talk) {
    logMessage('处理离开:', 'success' )
    console.log(talk)
    // 在这里执行处理离开的操作
}

// 处理消息类型的函数
function handleMessage(talk) {
    const { from, message } = talk; // 解构获取属性
    const { name, id, time } = from; // 解构获取属性

    // 检查消息发送者是否与当前用户相同
    if (name === localStorage.username) {
        logMessage('消息发送者与当前用户相同，不处理消息。', 'warning');
        return; // 如果相同，则不继续处理消息
    }

    logMessage('处理消息:', 'success');
    console.log(talk);

    // 检查本地存储值 songChecked
    const songChecked = localStorage.getItem("songChecked") === "true";

    // 如果 songChecked 为 true，则正常处理点歌操作
    if (songChecked) {
        const trimmedMessage = message.trim();

        // 检查消息内容是否以 "播放" 开头
        if (trimmedMessage.startsWith("播放")) {
            // 提取播放后面的字符串
            const songToPlay = trimmedMessage.substring("播放".length).trim();
            // 执行处理播放请求的逻辑
            if (songToPlay !== '') {
                handleSongRequest(songToPlay, name, id, time);
                return; // 继续执行后面的逻辑
            } else {
                // 如果播放后面的字符串为空，返回错误消息
                logMessage("播放歌曲不能为空", 'error');
            }
        } else if (trimmedMessage.startsWith("点歌")) {
            // 正常处理点歌请求的逻辑
            // 提取点歌后面的字符串
            const songRequest = trimmedMessage.substring("点歌".length).trim();
            // 执行你的自定义函数来处理点歌请求
            if (songRequest !== '') {
                handleSongRequest(songRequest, name, id, time);
            } else {
                // songRequest 为空，返回错误消息
                logMessage("点歌歌名不能为空", 'error');
            }
        }
    } else {
        // 如果 songChecked 为 false，则打印提示信息
        sendMessage('自助点歌功能未启用')
        logMessage("自助点歌功能未启用", 'warning');
    }
    // 在这里执行处理消息的操作
}

// 处理音乐类型的函数
function handleMusic(talk){
    console.log(talk)
    // 手机设备才执行播放歌曲
    if (profile.device === 'mobile'){
        if (Player.isPausing){
            // 开始播放音乐
            logMessage('开始播放音乐','success')
            // 创建音乐项对象，传入音乐数据对象作为参数
            const musicItem = new MusicItem(talk.music);
            // 播放音乐
            musicItem.play()
        }else{
            // 首次点歌必须点击一下
            const tip = layer.alert('手机首次点歌必须点击确认一下', {
                shadeClose: true,
                id: 'tip',
                title: '提示信息'
            }, function(){
                // 开始播放音乐
                logMessage('开始播放音乐','success')
                // 创建音乐项对象，传入音乐数据对象作为参数
                const musicItem = new MusicItem(talk.music);
                // 播放音乐
                musicItem.play()
                layer.close(tip)
            });
        }
    }else{
        logMessage('播放歌曲功能仅支持手机端', 'warning')
    }
}