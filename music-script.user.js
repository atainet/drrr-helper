// ==UserScript==
// @name        New script - drrr.com
// @namespace   Violentmonkey Scripts
// @match       https://drrr.com/*
// @grant       none
// @version     1.0
// @author      -
// @description 2023/10/6 22:21:09
// @require     https://fastly.jsdelivr.net/npm/layer-src@3.5.1/src/layer.min.js
// @resource    layerCss  https://fastly.jsdelivr.net/npm/layer-src@3.5.1/dist/theme/default/layer.min.css
// @unwrap
// ==/UserScript==

// 定义全局变量
let currentIconName = '' // 创建一个变量以存储当前图标名称
let autoSongInProgress = false // 添加一个标志来表示是否正在进行自动点歌的操作
let playCompleteFlag = 0    // 创建播放完成标志，初始值为0
let playStartFlag = 0       // 创建播放开始标志，初始值为0
let lastRequestedSong = null // 外部创建一个变量来存储上一首点的歌曲信息
const userSongTimestamps = {}  // 外部创建一个对象来跟踪每个用户的点歌时间戳// 外部创建一个对象来跟踪每个用户的点歌时间戳
// 定义全局变量来维护歌曲列表和当前播放歌曲的索引
const songList = [   // 歌曲列表
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
]
// 创建一个消息类型到处理函数的映射
const typeToHandler = {
    'music': handleMusic,
    'join': handleJoin,
    'leave': handleLeave,
    'message': handleMessage
}



// 添加全局事件监听器
$(document).ready(function () {
    // 初始化逻辑
    initialize()

    // 监听播放状态变化
    waitForMusicPlayer();

    // 添加 AJAX 请求监听器
    setupAjaxListeners();
})




// 初始化函数
function initialize() {
    // 获取当前图标名称
    getCurrentIconName()

    // 创建并添加样式表
    createAndAppendStylesheet()

    // 创建设置按钮
    createAndAppendSettingsButton()

    // 设置按钮点击事件
    settingsButtonClick()
}




// 获取当前图标名称
function getCurrentIconName() {
    // 检查当前位置是否包含 "lounge"
    if (window.location.href.includes('lounge')) {
        // 获取图标的类名
        const iconClassName = document.querySelector('.icon .avatar').classList[1]

        // 使用正则表达式替换 "avatar-" 为空字符串，以获取图标名称
        currentIconName = iconClassName.replace(/^avatar-/, '')

        // 将获取的 currentIconName 写入本地存储
        if (currentIconName) {
            localStorage.setItem('currentIconName', currentIconName)
            console.log('获取用户icon成功')
        }
    }
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
}

// 创建并添加设置按钮
function createAndAppendSettingsButton() {
    //const n=document.getElementById('np');const s=document.createElement('span');s.style.cssText='position:absolute;right:20px;color:red';s.textContent='脚本设置';n.appendChild(s)
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

// 设置按钮点击事件
function settingsButtonClick() {
    waitForElementToExist('#settings', (element) => {
        element.addEventListener('click', () => {
            console.log('点击了设置按钮')
            layer.open({
                type: 1, // page 层类型
                title: '脚本设置',
                shade: 0.6, // 遮罩透明度
                shadeClose: true, // 点击遮罩区域，关闭弹层
                maxmin: true, // 允许全屏最小化
                anim: 6, // 0-6 的动画形式，-1 不开启
                content: '<div style="padding: 32px;">一个普通的页面层，传入了自定义的 HTML</div>'
            });
        })
    })
}

// 等待音乐播放器元素出现
function waitForMusicPlayer() {
    // 监听播放状态变化
    waitForElementToExist('.player-inner-wrap .progress-music', (element) => {
        console.log('已找到音乐播放器元素')
        // 创建 MutationObserver 来监视元素的属性变化
        const observer = new MutationObserver((mutationsList) => {
            for (let mutation of mutationsList) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    // 检查元素的class是否包含'active'且aria-valuenow属性为100
                    if (element.classList.contains('active')) {
                        // 只有当playStartFlag为偶数时执行
                        if (playStartFlag % 2 === 0) {
                            // 执行播放开始操作
                            console.log('播放开始')
                            // 5秒后执行的定时器，用于在播放开始时将标志设置为false
                            setTimeout(function() {
                                autoSongInProgress = false
                            }, 5000) // 5秒后执行
                        }

                        // 增加playStartFlag的值
                        playStartFlag++
                    } else if (element.classList.contains('inactive') && Player.isPausing && element.getAttribute('aria-valuenow') === '100') { // 当前播放进度必须到达100才执行自动播放
                        // 只有当playCompleteFlag为偶数时执行
                        if (playCompleteFlag % 2 === 0) {
                            // 执行播放完毕操作
                            console.log('播放结束')
                            // 音乐播放完毕后触发自动点歌逻辑
                            autoSongRequest()
                        }

                        // 增加playCompleteFlag的值
                        playCompleteFlag++
                    }
                }
            }
        })

        // 开始监视元素的属性变化
        observer.observe(element, { attributes: true })
    })
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
                    console.log('请求最新消息完成。最新消息:')
                    talksArray.forEach(talk => {
                        // 根据 "type" 属性调用相应的处理函数
                        const handler = typeToHandler[talk.type]
                        if (handler) {
                            handler(talk)
                        } else {
                            console.log('未知类型:', talk.type)
                        }
                    })
                } else {
                    console.log('请求最新消息完成。没有新消息。')
                }
            } catch (error) {
                console.error('无法解析 JSON 响应数据:', error)
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
                    console.log('用户主动通过表单发送消息')
                } else {
                    console.log('脚本自动处理发送消息')
                    let name = localStorage.username  // 获取本地用户名
                    // 使用 URLSearchParams 来解析
                    const params = new URLSearchParams(requestDatas)
                    // 获取键值对
                    const requestData = {}
                    for (const [key, value] of params) {
                        requestData[key] = value
                    }
                    // 从本地存储中获取 currentIconName
                    const storedIconName = localStorage.getItem('currentIconName')
                    if (!storedIconName || storedIconName === '') { // 如果 storedIconName 不存在或为空字符串
                        const userResponse = confirm('图标不存在或为空。是否返回等候室重新获取图标？')

                        if (userResponse) {
                            // 用户点击了确认按钮，执行 POST 请求
                            $.post('/room/?ajax=1', { leave: 'leave' }, function(responseData) {
                                if (!responseData) {
                                    // 如果 POST 请求成功并且响应为空，执行重定向逻辑
                                    console.log('POST 请求成功，返回等候室。')
                                    window.location.href = '/lounge' // 重定向到等候室页面
                                } else {
                                    // 如果 POST 请求成功但响应不为空，可以根据需要执行其他操作
                                    console.log('POST 请求成功，但响应不为空:', responseData)
                                }
                            }).fail(function(error) {
                                // 处理请求失败的情况
                                console.error('POST 请求失败:', error)
                            })
                        } else {
                            // 用户点击了取消按钮，可以执行其他操作或不执行任何操作
                            console.log('用户取消了返回等候室操作。')
                        }
                    }
                    // 插入本地消息
                    const talks = document.getElementById('talks')
                    const div = `
                    <dl class="talk ${storedIconName}">
                        <dt class="dropdown user">
                            <div class="avatar avatar-${storedIconName}"></div>
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
    // 如果正在进行自动点歌的操作，则直接返回，避免重复调用
    if (autoSongInProgress) {
        console.log('正在自动点歌中，不重复操作。')
        return
    }

    // 如果正在播放音乐,这直接返回,避免重复点歌
    if(Player.isPausing === false){
        console.log('正在播放音乐，不重复点歌。')
        return
    }

    // 设置标志为 true，表示正在进行自动点歌的操作
    autoSongInProgress = true

    if (songList.length > 0) {

        // 随机选择一个歌曲
        const randomIndex = Math.floor(Math.random() * songList.length)

        // 点歌选定的歌曲
        const selectedSongName = songList[randomIndex]

        // 使用 getSongInfo 函数来获取歌曲的URL
        getSongInfo(selectedSongName, function(url, songName) {
            // 在成功回调函数中点歌
            sendMusicRequest(url, songName)
            console.log('自动点歌:', songName)
        }, function(errorMessage) {
            console.error('自动点歌失败:', errorMessage)
        })
    } else {
        console.log('歌曲列表为空，无法自动点歌。')
    }
}

// 自定义处理点歌请求的函数
function handleSongRequest(songRequest, name, id) {

    // 检查当前这首点的歌曲是否与上一首不一样
    if (lastRequestedSong === songRequest) {
        // 上一首点的歌曲与当前这首一样，触发错误提示
        console.log('上一首点的歌曲与当前这首相同，请选择其他歌曲。')
        //  发送消息提示用户
        sendMessage('上一首点的歌曲与当前这首相同，请选择其他歌曲。')
        return
    }

    // 获取当前时间戳
    const currentTime = Date.now()
    // 定义秒数限制，例如设置为 30 秒
    const songRequestLimitInSeconds = 30
    // 设置点歌频率的秒数限制
    const songRequestLimit = songRequestLimitInSeconds * 1000 // 将秒数转换为毫秒

    // 检查用户是否在指定秒数内重复点歌
    if (userSongTimestamps[id] && currentTime - userSongTimestamps[id] < songRequestLimit) {
        // 用户在指定秒数内重复点歌，触发错误提示
        console.log('@' + name + ' 点歌的频率太高，请稍后再试。限制时间：' + songRequestLimitInSeconds + '秒')
        // 发送消息提示用户
        sendMessage('@' + name + ' 点歌的频率太高，请稍后再试。限制时间：' + songRequestLimitInSeconds + '秒')
        return
    }

    // 更新用户的点歌时间戳
    userSongTimestamps[id] = currentTime

    // 更新上一首点的歌曲信息
    lastRequestedSong = songRequest

    // 在这里执行你的点歌处理逻辑
    console.log('收到点歌请求:', songRequest)

    // 定义一个处理成功地回调函数
    function onSuccess(url, songName) {
        console.log('成功获取歌曲 URL:', url)
        console.log('歌曲名称:', songName)
        // 在这里执行你的进一步操作，比如发送音乐请求
        sendMusicRequest(url, songName)
    }

    // 定义一个处理失败的回调函数
    function onError(errorMessage) {
        console.error('获取歌曲 URL 失败:', errorMessage)
        // 在这里执行你的错误处理逻辑
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
            console.log('发送音乐成功！')
        } else if (responseData === '慢一点，你发送得太快了！') {
            // 响应为 '慢一点，你发送得太快了！'，等待2秒后重新发送
            console.log('发送音乐过快，等待3秒后重新发送...')
            setTimeout(function() {
                sendMusicRequest(url, name) // 重新发送音乐请求
            }, 3000) // 等待3秒
        } else {
            // 其他情况，处理响应数据
            console.log('处理响应数据:', responseData)
        }
    }).fail(function(error) {
        // 处理请求失败的情况
        console.error('发送音乐请求失败:', error)
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
                console.log("消息发送成功！")
            } else {
                // 响应不为空，可能包含错误信息或其他内容
                console.log("消息发送失败，响应内容：" + response)
            }
        },
        error: function(jqXHR, textStatus) {
            // 请求失败的处理
            console.error("消息发送失败，错误信息：" + textStatus)
        }
    })
}

// 通过关键词获取音乐url
function getSongInfo(keyword, successCallback, errorCallback) {
    // 第一次请求，获取歌曲信息数组
    $.get(`https://kwapi-api-iobiovqpvk.cn-beijing.fcapp.run/search?pn=1&key=${keyword}`, function(responseData) {
        try {
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
                    errorCallback('获取歌曲 URL 失败') // 调用错误回调函数
                })
            } else {
                console.error('无法获取歌曲信息数组或数组为空')
                errorCallback('无法获取歌曲信息数组或数组为空') // 调用错误回调函数
            }
        } catch (error) {
            console.error('解析响应数据为 JSON 失败:', error)
            errorCallback('解析响应数据为 JSON 失败') // 调用错误回调函数
        }
    }).fail(function(error) {
        console.error('获取歌曲信息数组失败:', error)
        errorCallback('获取歌曲信息数组失败') // 调用错误回调函数
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




// 处理音乐类型的函数
function handleMusic(talk) {
    console.log('处理音乐:', talk)
    // 检查 talk.from.name 是否等于 localStorage.username
    if (talk.from.name === localStorage.username) {
        console.log('消息发送者与当前用户相同，不处理消息。')
    }
}

// 处理加入类型的函数
function handleJoin(talk) {
    console.log('处理加入:', talk)
    // 在这里执行处理加入的操作
}

// 处理离开类型的函数
function handleLeave(talk) {
    console.log('处理离开:', talk)
    // 在这里执行处理离开的操作
}

// 处理消息类型的函数
function handleMessage(talk) {
    const { from, message } = talk // 解构获取属性
    const { name, id, time } = from // 解构获取属性

    // 检查消息发送者是否与当前用户相同
    if (name === localStorage.username) {
        console.log('消息发送者与当前用户相同，不处理消息。')
        return // 如果相同，则不继续处理消息
    }

    console.log('处理消息:', talk)

    // 检查消息内容是否以特定前缀开头（例如 "点歌"）
    const trimmedMessage = message.trim()
    if (trimmedMessage.startsWith("点歌")) {
        // 提取点歌后面的字符串
        const songRequest = trimmedMessage.substring("点歌".length).trim()
        // 执行你的自定义函数来处理点歌请求
        handleSongRequest(songRequest, name, id, time)
    }
    // 在这里执行处理消息的操作
}




