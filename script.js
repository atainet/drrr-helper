// ==UserScript==
// @name        DRRR.COM智能脚本 - 自动对话 - 自动点歌
// @description 让DRRR.COM聊天室支持点歌、智能聊天功能
// @namespace   Violentmonkey Scripts
// @match       https://drrr.com/room/?id=*
// @license     MIT
// @grant       GM_addStyle
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_addElement
// @runat      document-end
// @version     2.5.15
// @author      QQ:121610059
// @update      2023-06-06 14:02:31
// @supportURL  https://greasyfork.org/zh-CN/scripts/414535-drrr-com%E6%99%BA%E8%83%BD%E8%84%9A%E6%9C%AC-%E8%87%AA%E5%8A%A8%E5%AF%B9%E8%AF%9D-%E8%87%AA%E5%8A%A8%E7%82%B9%E6%AD%8C
// ==/UserScript==

(function () {
    'use strict'

    // 引入layer.js
    loadScript('https://cdn.bootcdn.net/ajax/libs/layer/3.5.1/layer.min.js', 'layer')
    // 设置默认欢迎文本
    const welcome_text = '欢迎{username}进入聊天室'
    // 设置定时发送默认间隔时间
    const interval_time = 60
    // 设置定时发送的文本
    const timer_str = '你好,现在时间是{time}'

    // 添加样式
    GM_addStyle(`
        .message_box_effect_wraper{
            height: 100%;
        }
        .room-input-wrap,
        .room-submit-wrap,
        #talks{
            //display:none;
        }
        #drrr-auto-panel{
            font-weight: bold;
        }
        #drrr-auto-content{
            display: flex;
            align-content: center;
            justify-content: center;
            flex-wrap: wrap;
            align-items: flex-start;
        }
        #drrr-auto-content .items{
            display: flex;
            align-items: center;
            padding: 8px;
        }
        #drrr-auto-content a{
            color: #aaa;
        }
        #drrr-auto-content input[type=checkbox]{
            margin: auto;
            margin-right: 3px;
        }
        
       #drrr-auto-content input[type=checkbox]{
            outline: none;
            appearance: none;
            position: relative;
            width: 2.6rem;
            height: 1.52rem;
            border-radius: 50px;
            border: 1px solid #ccc;
            background-color: #ccc;
       }
       #drrr-auto-content input[type=checkbox]::after{
            content: '';
            display: inline-block;
            width: 1.4rem;
            height: 1.4rem;
            border-radius: 50%;
            background-color: #fff;
            box-shadow: 0 0 0 2px #999;
            transition: left 0.1s linear;
            position: absolute;
            top: 0;
            left: 0;
       }
       #drrr-auto-content input[type=checkbox]:checked{
            background-color: #32ba58;
       }
       #drrr-auto-content input[type=checkbox]:checked:after{
            position: absolute;
            top: 0;
            left: 50%;
       }
       .layui-layer-content{
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
       }
       .layui-layer-content button{
            color: #262629;
            margin: 5px auto;
            background-color: #fff;
            border-radius: 9px;
            padding: 5px;
       }
       
       .layui-layer-content .user-items div{
            display: inline-block;
            width:50%;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
       }
    `)

    // **添加drr-auto面板元素
    const message_box_effect_wraper = document.querySelector('.message_box_effect_wraper')
    const drrr_auto_panel = GM_addElement(document.querySelector('.message_box_effect_wraper'), 'div', {id: 'drrr-auto-panel'})
    drrr_auto_panel.innerHTML = `
    <div id="drrr-auto-content">
        <div class="items"><input type="checkbox" id="song_checkbox"><span>点歌功能</span></div>
        <div class="items"><input type="checkbox" id="admin_hand_checkbox"><span>管理员切歌</span></div>
        <div class="items"><input type="checkbox" id="song_list_checkbox"><span>点歌队列</span></div>
        <div class="items"><input type="checkbox" id="auto_song_checkbox"><span>自动点歌</span></div>
        <div class="items"><input type="checkbox" id="chat_checkbox"><span>智能聊天</span></div>
        <div class="items"><input type="checkbox" id="welcome_checkbox"><span>欢迎加入</span></div>
        <div class="items"><input type="checkbox" id="timer_checkbox"><span>定时发送</span></div>
        <div class="items"><span id="config">配置更多信息</span></div>
    </div>`

    // 点歌checkbox
    const song_checkbox = document.querySelector('#song_checkbox')
    // 管理员切歌checkbox
    const admin_hand_checkbox = document.querySelector('#admin_hand_checkbox')
    // 点歌队列checkbox
    const song_list_checkbox = document.querySelector('#song_list_checkbox')
    // 自动点歌checkbox
    const auto_song_checkbox = document.querySelector('#auto_song_checkbox')
    // 聊天checkbox
    const chat_checkbox = document.querySelector('#chat_checkbox')
    // 欢迎加入checkbox
    const welcome_checkbox = document.querySelector('#welcome_checkbox')
    // 定时checkbox
    const timer_checkbox = document.querySelector('#timer_checkbox')

    // 设置checkbox选中状态
    GM_getValue('song_checkbox', false) ? song_checkbox.checked = true : song_checkbox.checked = false
    GM_getValue('admin_hand_checkbox', true) ? admin_hand_checkbox.checked = true : admin_hand_checkbox.checked = false
    GM_getValue('song_list_checkbox', false) ? song_list_checkbox.checked = true : song_list_checkbox.checked = false
    GM_getValue('auto_song_checkbox', false) ? auto_song_checkbox.checked = true : auto_song_checkbox.checked = false
    GM_getValue('chat_checkbox', false) ? chat_checkbox.checked = true : chat_checkbox.checked = false
    GM_getValue('welcome_checkbox', false) ? welcome_checkbox.checked = true : welcome_checkbox.checked = false
    GM_getValue('timer_checkbox', false) ? timer_checkbox.checked = true : timer_checkbox.checked = false

    // 自动点歌选中状态提示用户点击一下
    let auto_song_click = false
    if (auto_song_checkbox.checked ){
        swal({title:'开启自动点歌功能每次重新启动脚本必须点击一下确定'},function () {
            auto_song_click = true
        })
    }else{
        auto_song_click = true
    }

    // **点击事件绑定
    document.addEventListener('click', function (e) {
        // checkbox点击事件绑定
        if (e.target.tagName === 'INPUT' && e.target.type === 'checkbox') {
            let checked = e.target.checked
            let tip = e.target.nextElementSibling.innerText
            GM_setValue(e.target.id, e.target.checked)
            checked ? layer.msg(`${tip}已开启`) : layer.msg(`${tip}已关闭`)
        }
        // tip点击事件绑定
        if (e.target.tagName === 'SPAN') {
            switch (e.target.innerText) {
                case '点歌功能':
                    layer.tips('让聊天室支持点歌功能 格式: 点歌+歌曲名', e.target, {tips: 3})
                    break
                case '管理员切歌':
                    layer.tips('打开此功能后只有管理员可以切歌', e.target, {tips: 3})
                    break
                case '点歌队列':
                    layer.tips('让点歌功能支持队列,而不是直接切换歌曲', e.target, {tips: 3})
                    break
                case '自动点歌':
                    layer.tips('让聊天室没有音乐播放时自动播放随机音乐', e.target, {tips: 3})
                    break
                case '智能聊天':
                    layer.tips('简单聊天功能 格式: @BOT+想说的话', e.target, {tips: 3})
                    break
                case '欢迎加入':
                    layer.tips('有人进入房间时欢迎加入', e.target, {tips: 3})
                    break
                case '定时发送':
                    layer.tips('设置定时发送信息', e.target, {tips: 3})
                    break
            }
        }
        // 全局配置事件
        if (e.target.id === 'config') {
            layer.open({
                type: 1,
                title: '更多配置',
                area: ['200px'],
                id: 'config_layer',
                content: `
                <button>设置房间管理</button>
                <button>设置随机音乐</button>
                <button>设置欢迎文本</button>
                <button>设置定时间隔</button>
                <button>设置定时文本</button>`
            });
        }
        // 配置项点击事件绑定
        if (e.target.parentNode.id === 'config_layer') {
            switch (e.target.innerText) {
                case '设置房间管理':
                    let str = ''
                    for (let i = 0; i < room.users.length; i++) {
                        str += `<div data-id="${room.users[i].id}">${room.users[i].name}</div><div><a href="javascript:" id="set_admin">设为管理员</a></div>`
                    }
                    layer.open({
                        type: 1,
                        title: '选择用户',
                        //area: ['350px'],
                        content: `<div style="padding: 11px;color: #000;text-align: center;">
                        <div class="user-items">${str}</div>
                        </div>`
                    });
                    break
                case '设置欢迎文本':
                    layer.prompt({
                        title: e.target.innerText,
                        value: GM_getValue('welcome_text', welcome_text),
                        formType: 2,
                        btn: ['保存', '退出'],
                    }, function (text, index) {
                        GM_setValue('welcome_text', text)
                        layer.close(index)
                        layer.msg('保存成功')
                    })
                    break
                case '设置随机音乐':
                    let random_music_lists = GM_getValue('random_music_lists', [])
                    layer.prompt({
                        title: e.target.innerText,
                        value: random_music_lists.join('\n'),
                        formType: 2,
                        area:['96vw', '96vh'],
                        btn: ['保存', '退出'],
                    }, function (text, index) {
                        let random_music_lists_array = text.split('\n').filter(function (string) {
                            return string && string.trim()
                        })
                        GM_setValue('random_music_lists', random_music_lists_array)
                        layer.close(index)
                        layer.msg('保存成功')
                    })
                    break
                case '设置定时间隔':
                    layer.prompt({
                        title: `${e.target.innerText}(单位:秒)`,
                        formType: 0,
                        value: GM_getValue('interval_time', interval_time)
                    }, function (time, index) {
                        if (isNaN(+time)) {
                            return layer.msg('只能输入数字(10-240)')
                        }
                        if (time < 10 || time > 240) {
                            return layer.msg('间隔时间只能在10-240之间')
                        }
                        GM_setValue('interval_time', time)
                        layer.close(index)
                        layer.msg('保存成功')
                    })
                    break
                case '设置定时文本':
                    layer.prompt({
                        title: e.target.innerText,
                        value: GM_getValue('timer_str', timer_str),
                        formType: 2,
                        btn: ['保存', '退出'],
                    }, function (text, index) {
                        GM_setValue('timer_str', text)
                        layer.close(index)
                        layer.msg('保存成功')
                    })
                    break
            }
        }
        // 设置管理员
        if (e.target.id === 'set_admin') {
            let id = e.target.parentElement.previousElementSibling.dataset.id
            let name = e.target.parentElement.previousElementSibling.textContent
            GM_setValue('admin_id', id)
            GM_setValue('admin_name', name)
            sendMessage(`已设置${name}为管理员`)
            layer.msg(`已设置${name}为管理员`)
        }
    })

    // 拦截drrr消息
    $.ajaxSetup({
        complete: function (XMLHttpRequest, textStatus) {
            let url = this.url
            let {status: status, responseJSON: json} = XMLHttpRequest
            let talks = []
            if (status === 200 && url.includes('update')) {
                talks = json.talks
                if (talks.length <= 0) return
                talks.forEach((element, index) => {
                    if (element.is_me) return
                    console.log(element)
                    switch (element.type) {
                        case 'join':
                            console.log('收到用户加入信息')
                            // 欢迎用户加入
                            if (welcome_checkbox.checked) {
                                let new_str = replaceStr(GM_getValue('welcome_text', welcome_text), username)
                                sendMessage(new_str)
                            }
                            break
                        case 'leave':
                            console.log('收到用户退出信息')
                            break
                        case 'user-profile':
                            console.log('收到用户加入退出信息')
                            break
                        case 'music':
                            console.log('收到音乐消息')
                            break
                        default :
                            console.log('收到普通消息')
                            // 接收新消息
                            let content = element.message || element.content
                            let username = element.from.name
                            let id = element.from.id
                            console.log(`用户: ${username}`)
                            console.log(`信息: ${content}`)
                            console.log(`ID: ${id}`)
                            // 点歌功能
                            if (song_checkbox.checked && content.includes('点歌') && content.length > 2) {
                                let song_name = content.replace('点歌', '').trim()
                                song(song_name)
                            }
                            // 聊天功能
                            if (chat_checkbox.checked && content.includes(`@${profile.name}`) && content.length > 1) {
                                let ask_content = content.replace(`@${profile.name}`, '').trim()
                                chat(username, ask_content)
                            }
                            // 查看歌单
                            if (content === '查看队列'){
                                console.log(play_list_array.length)
                                if (play_list_array.length > 0) {
                                    sendMessage(`播放队列:\n${play_list_array.join('\n')}`)
                                }else{
                                    sendMessage(`当前队列内暂无歌曲哦~`)
                                }
                            }
                            // 切歌功能
                            if (content === '切歌'){
                                if (admin_hand_checkbox.checked){
                                    if (GM_getValue('admin_id') && GM_getValue('admin_id') === id){
                                        Player.nowPlaying.howl.pause()
                                        Player.isPausing = true
                                    }else{
                                        sendMessage(`当前模式仅支持管理员切歌功能, 目前管理员为${GM_getValue('admin_name','暂未设置管理员')}.`)
                                    }
                                }else{
                                    Player.nowPlaying.howl.pause()
                                    Player.isPausing = true
                                }
                            }
                            if(GM_getValue('admin_id') && GM_getValue('admin_id') === id){
                                switch (content) {
                                    case '切歌':
                                        Player.nowPlaying.howl.pause()
                                        Player.isPausing = true
                                        break
                                }
                            }
                            break
                    }
                })
            }
        }
    })

    function intervalSendFn() {
        let time = GM_getValue('interval_time', interval_time)
        console.log(`提示: 当前定时间隔为${time}秒`)
        let new_timer_str = replaceStr(GM_getValue('timer_str', timer_str))
        timer_checkbox.checked && sendMessage(`${new_timer_str}`).then(() => {
            console.log(`发送: ${new_timer_str}`)
        })
        clearInterval(intervalSendTimer)
        if (time !== interval_time) intervalSendTimer = setInterval(intervalSendFn, time * 1000)
    }

    // 替换文本中的自定义变量
    function replaceStr(str, username) {
        let new_str = str.replace('{time}', new Date().toLocaleString())
        if (username) new_str = new_str.replace('{username}', username)
        return new_str
    }

    // 点歌功能
    let play_list_array = []
    function song(keyword) {
        // 当前音乐在播放的话就加入队列
        if(song_list_checkbox.checked && !Player.isPausing){
            play_list_array.push(keyword)
            let str = `${keyword}已加入队列,排第${play_list_array.lastIndexOf(keyword)+1}位.\n发送"查看队列"可以查看当前播报列表.`
            console.log(`提示: ${str}`)
            sendMessage(str)
            return
        }
        let ajax = $.ajax({
            'url': `https://api.533526.top/drrrAuto/?action=getKeywodMusicUrl&keyword=${keyword}`,
            'type': 'get',
            'dataType': 'json',
            success: function (res) {
                if (res.code === 1) {
                    let {songName = songName, singer = singer, songUrl = songUrl} = res.data
                    sendMessage(`接下来让我们一起欣赏${singer}演唱的歌曲《${songName}》`)
                    let data = {name: `${songName} - ${singer}`, url: songUrl}
                    sendMessage(data).then(() => {
                        layer.msg(`点播歌曲《${data.name}》`)
                        console.log(`点歌: ${data.name}`)
                    })
                } else {
                    console.log('提示: 获取歌曲信息失败')
                }
            }
        })
        return ajax
    }

    // 聊天功能
    function chat(form, content) {
        let ajax = $.ajax({
            'url': 'https://api.533526.top/drrrAuto/?action=getReply',
            'type': 'post',
            'data': {
                ask: content,
                form: `${profile.room_id}_${form}`,
                fromName: form
            },
            'dataType': 'json',
            success: function (res) {
                if (res.code === 1) {
                    let {reply = reply, fromName = fromName} = res.data
                    console.log(`回复: ${reply}`)
                    sendMessage(`@${fromName} ${reply}`)
                } else {
                    layer.msg(res.message)
                }
            }
        })
        return ajax
    }

    // 加载script
    function loadScript(url, name) {
        let script = document.createElement("script")
        script.src = url
        script.id = name
        document.body.appendChild(script)
        return script
    }

    // 发送消息
    function sendMessage(content) {
        if (content === undefined) return false
        let data = typeof content === 'string' ? {message: content, url: '', to: ''} : {
            music: 'music',
            url: content.url,
            name: content.name
        }
        let ajax = $.ajax({
            method: "post",
            url: '/room/?ajax=1',
            async: false,
            data: data
        })
        return ajax
    }

    // 定时检测播放状态
    let geting = false
    setInterval(function () {
        if (auto_song_checkbox.checked && Player.isPausing && geting === false && auto_song_click) {
            geting = true
            if (song_list_checkbox.checked && play_list_array.length > 0){
                song(play_list_array.shift()).then(() => {
                    setTimeout(() => geting = false, 3000)
                })
                console.log(play_list_array)
                return
            }else{
                let random_music_lists = GM_getValue('random_music_lists',['稻香','花海','一路向北','蒲公英的约定'])
                let random_num = Math.floor(Math.random() * random_music_lists.length)
                song(random_music_lists[random_num]).then(() => {
                    setTimeout(() => geting = false, 3000)
                })
            }
        }
    }, 3000)

    // 定时发送消息
    let intervalSendTimer = setInterval(intervalSendFn, GM_getValue('interval_time', interval_time) * 1000)

})();
