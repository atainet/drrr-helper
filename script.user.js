// ==UserScript==
// @name        drrr-helper
// @description 让DRRR.COM聊天室支持点歌、智能聊天功能
// @namespace   Violentmonkey Scripts
// @match       https://drrr.com/*
// @license     MIT
// @grant       GM_addStyle
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_getResourceText
// @grant       GM_addElement
// @run-at      document-end
// @resource    hsycmsAlertCss https://sywlgzs.gitee.io/hsycmsalert/hsycmsAlert.min.css
// @resource    customCss https://ghps.cc/https://raw.githubusercontent.com/atainet/drrr-helper/master/static/css/style.css
// @require     https://unpkg.com/pxmu@1.1.0/dist/web/pxmu.min.js
// @require     http://sywlgzs.gitee.io/hsycmsalert/hsycmsAlert.min.js
// @version     3.0.0
// @author      QQ:121610059
// @update      2023-06-06 14:02:31
// @supportURL  https://greasyfork.org/zh-CN/scripts/414535-drrr-com%E6%99%BA%E8%83%BD%E8%84%9A%E6%9C%AC-%E8%87%AA%E5%8A%A8%E5%AF%B9%E8%AF%9D-%E8%87%AA%E5%8A%A8%E7%82%B9%E6%AD%8C
// ==/UserScript==

(function () {

    'use strict'

    // 页面中插入css样式
    GM_addStyle(GM_getResourceText('hsycmsAlertCss') + GM_getResourceText('customCss'))
    // 判断当前是否在等候室
    const isWaitingRoom = location.pathname.includes('lounge')
    // 判断当前是否在房间
    const isRoom = location.pathname.includes('room')
    // 脚本drrr名称
    const drrrName = localStorage.username
    // 登陆成功后提示脚本注入成功
    if (isWaitingRoom){
        hsycms.success('success','油猴脚本注入成功')
    }
    // 进入房间后插入控制面板
    if (isRoom){
        insertDrrrHelperControlPanel()
    }

    // 拦截消息
    let interceptSend = false
    $.ajaxSetup({
        /*beforeSend: function(XMLHttpRequest,settings) {
            // 获取将要请求的 URL
            const requestUrl = settings.url
            // // 如果是用户主动发送消息就不处理消息
            interceptSend = !!requestUrl.includes('ajax');
        },*/
        complete: function (XMLHttpRequest) {
            // 获取拦截的url地址
            const url = this.url
            // 解构新消息
            const { responseJSON } = XMLHttpRequest
            // 判断是不是非空消息并且忽略用户主动发送信息的返回消息
            if (url.includes('update') && responseJSON.talks.length > 0 && interceptSend === false) {
                const { talks } = responseJSON
                // 新消息有一定概率不是一条消息遍历新消息
                for (const message of talks) {
                    if (message.type !== 'user-profile') {
                        // 调用函数处理消息
                        window[message.type](message)
                    }
                }
            }
        }
    })

    // 处理加入消息
    window.join = function({ user:{ name } }) {
        console.log("join: " + name)
        aiChat('欢迎我加入房间,我的名字是' + name)
    }

    // 处理退出消息
    window.leave = function({ user:{ name } }) {
        console.log("leave: " + name)
    }

    // 处理音乐消息
    window.music = function({ music:{ name, playURL:url } }) {
        // 如果不是脚本自己的消息
        if (drrrName === name){
            console.log("music: " + name, url)
        }
    }

    // 处理文本消息
    window.message = function({ message, from: { name , id , icon} }) {
        // 如果是脚本自己的消息
        if (drrrName === name){
            // 创建本地聊天记录
            createChatRecord({name,icon,message})
        }else{
            // 正常处理其他用户的消息
            console.log("message: " + name,id,icon,message)
            // 调用函数处理用户消息
            handleUserMessage(name, id, icon, message);
        }
    }

    // ai聊天功能
    function aiChat(question = '你好') {
        fetchJsonData('https://tool.533526.top/drrr-helper/?action=getAiReply&question=' + question)
            .then((data) => {
                sendMsg(data.data.reply)
            })
    }

    // 发送随机音乐
    async function sendRandomMusic() {
        console.log('播放随机歌曲')
        // 随机音乐列表
        const musicList = [
            'メリッサ - ポルノグラフィティ',
            '消不去的罪 - Nana Kitade',
            '贝贝'
        ]
        // 抽取随机音乐
        const  randomMusic = musicList[Math.floor(Math.random() * musicList.length)]
        // 处理音乐请求
        return handledMusicKuwo(randomMusic)
    }

    // 处理用户消息的函数
    function handleUserMessage(name, id, icon, message) {
        // 判断是否是点歌消息
        const songName = startsWithDotSong(message)
        if (songName) {
            handledMusicKuwo(songName)
        } else {
            // 正常处理文本消息
            aiChat(message)
        }
    }

    // 判断是否是点歌请求
    function startsWithDotSong(text) {
        const match = text.match(/^点歌(.*)/)
        return match ? match[1] : false
    }

    // 处理点歌请求
    async function handledMusicKuwo(name) {
        try {
            // 请求获取歌曲rid
            const searchData = await fetchJsonData(`https://kwapi-api-iobiovqpvk.cn-beijing.fcapp.run/search?pn=1&key=${encodeURI(name)}`)
            if (searchData && searchData.length > 0) {
                const { rid, name: songName, artist: singer } = searchData[0];
                // 请求获取歌曲url
                const songUrl = await fetchTextData(`https://kwapi-api-iobiovqpvk.cn-beijing.fcapp.run/mp3?rid=${encodeURI(rid)}`)
                // 替换域名支持https
                const httpsSongUrl = songUrl.replace(/http:\/\/([^.]+)\.sycdn\.kuwo\.cn/, "https://$1-sycdn.kuwo.cn")
                // 发送歌曲
                sendMusic(songName +  ' - ' + singer, httpsSongUrl)
            } else {
                console.error('错误信息: ', '未找到匹配的歌曲信息')
                sendMsg('未找到匹配的歌曲信息')
            }
        } catch (error) {
            console.error('错误信息: ', error)
            sendMsg('点歌失败,请重试')
        }
    }

    // 发送音乐消息
    function sendMusic(name, url) {
        const sendData = {
            music: 'music',
            url,
            name
        };

        const sendRequest = () => {
            return $.ajax({
                method: "post",
                url: '/room/?ajax=1',
                data: sendData,
                success: (response) => {
                    if (response === "慢一点，你发送得太快了！") {
                        setTimeout(() => {
                            // 请求返回特定消息时，等待一秒后重试
                            sendRequest() // 重试请求
                        }, 2000)
                    } else {
                        // 请求成功
                        console.log("发送成功", response);
                    }
                },
                error: (error) => {
                    // 请求出错
                    console.error("请求出错", error);
                }
            })
        }

        // 发送第一次请求
        sendRequest()
    }

    // 获取文本数据
    function fetchTextData(url) {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: url,
                dataType: 'text',
                success: function(data) {
                    resolve(data); // 解析数据并通过 resolve 返回
                },
                error: function(xhr, status, error) {
                    reject(error); // 在错误时通过 reject 返回
                }
            })
        })
    }

    // 获取json数据
    function fetchJsonData(url) {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: url,
                dataType: 'json',
                success: function(data) {
                    resolve(data) // 解析数据并通过 resolve 返回
                },
                error: function(xhr, status, error) {
                    reject(error); // 在错误时通过 reject 返回
                }
            })
        })
    }

    // 插入控制面板元素
    function insertDrrrHelperControlPanel() {
        // 向页面中插入控制面板元素
        const drrrHelperControlPanel = GM_addElement(document.querySelector('.message_box_effect_wraper'), 'div', {id: 'drrr-auto-panel'})
        // 插入控制面板元素
        drrrHelperControlPanel.innerHTML = `
        <div id="drrr-auto-content">
            <div class="items"><input type="checkbox" id="song_checkbox"><span>点歌功能</span></div>
            <div class="items"><input type="checkbox" id="chat_checkbox"><span>智能聊天</span></div>
            <div class="items"><input type="checkbox" id="welcome_checkbox"><span>欢迎加入</span></div>
            <div class="items"><input type="checkbox" id="timer_checkbox"><span>定时发送</span></div>
        </div>`
    }

    // 发送文本消息
    function sendMsg(msg) {
        return $.ajax({
            method: "post",
            url: '/room/?ajax=1',
            data: {
                message:msg
            }
        })
    }

    // 创建本地聊天记录
    function createChatRecord(data) {
        // 解构数据
        const { name, icon, message } = data
        // 获取talks元素
        const talks = document.getElementById('talks')
        // 创建talk的元素结构
        const talk = `
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
                <div class="tail-wrap center" style="background-size: 65px;">
                  <div class="tail-mask"></div>
                </div>
                <p class="body select-text">${message}</p>
              </div>
            </dd>
          </dl>
        `
        // 插入新元素到父元素的最前面
        talks.insertAdjacentHTML("afterbegin", talk);
    }

})();
