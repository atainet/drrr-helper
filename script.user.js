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
// @resource    hsycmsAlertCss https://sywlgzs.gitee.io/hsycmsalert/hsycmsAlert.min.css
// @require     https://unpkg.com/pxmu@1.1.0/dist/web/pxmu.min.js
// @require     http://sywlgzs.gitee.io/hsycmsalert/hsycmsAlert.min.js
// @require     http://sywlgzs.gitee.io/hsycmsalert/hsycmsAlert.min.js
// @version     3.0.0
// @author      QQ:121610059
// @update      2023-06-06 14:02:31
// @supportURL  https://greasyfork.org/zh-CN/scripts/414535-drrr-com%E6%99%BA%E8%83%BD%E8%84%9A%E6%9C%AC-%E8%87%AA%E5%8A%A8%E5%AF%B9%E8%AF%9D-%E8%87%AA%E5%8A%A8%E7%82%B9%E6%AD%8C
// ==/UserScript==

(function () {

    'use strict'

    GM_addStyle(GM_getResourceText('hsycmsAlertCss'))
    // 判断是否在登录界面
    const isLoginPage = location.pathname.includes('/')
    // 判断但是是否在等候室
    const isWaitingRoom = location.pathname.includes('lounge')
    // 脚本drrr名称
    const drrrName = localStorage.username
    // 登陆成功后提示脚本注入成功
    if (isWaitingRoom){
        hsycms.success('success','油猴脚本注入成功')
    }

    // 拦截消息
    let interceptSend = false
    $.ajaxSetup({
        beforeSend: function(XMLHttpRequest,settings) {
            // 获取将要请求的 URL
            const requestUrl = settings.url;
            // 如果用户主动发送消息
            if (requestUrl.includes('ajax')){
                // 不处理返回消息
                interceptSend = true
            }else{
                // 正常处理消息
                interceptSend = false
            }
        },
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
        //sendMsg('欢迎加入')
    }

    // 处理退出消息
    window.leave = function({ user:{ name } }) {
        console.log("leave: " + name)
    }

    // 处理音乐消息
    window.music = function({ music:{ name, playURL:url } }) {
        console.log("music: " + name, url)
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
            sendMsg('你好哦')
        }
    }

    // 发送音乐消息
    const sendMusic = function (name, url) {
        return $.ajax({
            method: "post",
            url: '/room/?ajax=1',
            data: {
                music: 'music',
                url,
                name
            }
        })
    }

    // 发送文本消息
    const sendMsg = function (msg) {
        return $.ajax({
            method: "post",
            url: '/room/?ajax=1',
            data: {
                message:msg
            }
        })
    }

    // 创建本地聊天记录
    const createChatRecord = function(data, me = false) {
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
