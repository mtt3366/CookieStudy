var http = require('http')
var fs = require('fs')
var url = require('url')
var port = process.argv[2]

if (!port) {
    console.log('请指定端口号好不啦？\nnode server.js 8888 这样不会吗？')
    process.exit(1)
}

var server = http.createServer(function (request, response) {
    var parsedUrl = url.parse(request.url, true)
    var pathWithQuery = request.url
    var queryString = ''
    if (pathWithQuery.indexOf('?') >= 0) {
        queryString = pathWithQuery.substring(pathWithQuery.indexOf('?'))
    }
    var path = parsedUrl.pathname
    var query = parsedUrl.query
    var method = request.method

    /******** 从这里开始看，上面不要看 ************/
    //   这里开始写注册登录的路由

    console.log('方方说：含查询字符串的路径\n' + pathWithQuery)

    if (path === '/') {
        response.statusCode = 200
        let string = fs.readFileSync('./index.html')
        string = string.toString();
        var users = fs.readFileSync('./db/users', 'utf8')
        users = JSON.parse(users)//转化为user对象数组

        console.log(users);
        let cookies = request.headers.cookie || ''//['email=111', 'asdasd=111']
        cookies = cookies.split("; ")
        let hash={}
        cookies.forEach((string)=>{
            let parts = string.split("=")
            let key = parts[0]
            let value = parts[1]
            hash[key] = value;
        })
        
        let eamil = hash.sign_in_email
        let foundedUser
        users.forEach((userObj)=>{
            if(userObj.email===eamil){
                foundedUser = userObj;
            }
        })
        console.log(foundedUser);
        if(foundedUser){
            string = string.replace('__status__', '已登录')
            string = string.replace('__email__', foundedUser.email)
            string = string.replace('__password__', foundedUser.password)
        }else{
            string = string.replace('__status__', '未登录,请去登录')
            string = string.replace('__email__', '没')
            string = string.replace('__password__', '没')
        }
        
        response.setHeader('Content-Type', 'text/html;charset=utf-8')
        response.write(string)
        response.end()
    } else if (path === '/sign_up' && method === 'GET') { //这个路由只限进入sign_up这个页面,所以只需要用get,不附带数据,下面提交表单采用post
        response.statusCode = 200
        let string = fs.readFileSync('./sign_up.html')
        response.setHeader('Content-Type', 'text/html;charset=utf-8')
        response.write(string)
        response.end()
    } else if (path === '/sign_up' && method === 'POST') { //提交注册表单的路由
        readBody(request).then((body) => { //使用封装的读取body的函数,成功后参数为body,因为这里是异步事件,所以需要使用promise封装
            let message = body.split('&') //['email=1','password=2','repassword=3']
            let hash = {}
            message.forEach(element => {
                let parts = element.split('=')
                let key = parts[0]
                let value = parts[1]
                hash[key] = decodeURIComponent(value)
            });
            console.log(hash);
            let {
                email,
                password,
                repassword
            } = hash //es6语法
            if (email.indexOf('@') === -1) { //邮箱中没有@,返回一个邮箱无效的错误json
                response.statusCode = 400
                response.setHeader('Content-Type', 'application/json;charset=utf-8')
                response.write(`{
                        "email":"invalid"
                }`)
            } else { //存入db中的users数据库
                let users = fs.readFileSync('./db/users', 'utf8')
                console.log(users)
                console.log(typeof users)
                try {
                    users = JSON.parse(users) // []
                    console.log(typeof users)
                } catch (exception) {
                    users = []
                }
                let inUse = false
                for (let i = 0; i < users.length; i++) {
                    let user = users[i]
                    if (user.email === email) {
                        inUse = true
                        break;
                    }
                }
                if (inUse) {
                    response.statusCode = 400
                    response.write('email in use')
                } else {
                    users.push({
                        email: email,
                        password: password
                    })
                    let usersString = JSON.stringify(users)
                    fs.writeFileSync('./db/users', usersString)
                    response.statusCode = 200
                }
            }
            response.end()
        })
    } 
    /*接下来是登录的两个路由*/ 
    else if (path === '/sign_in' && method === 'GET') {//同样GET是获取登录页面,POST是表单提交
        let string = fs.readFileSync('./sign_in.html', 'utf8')
        response.statusCode = 200
        response.setHeader('Content-Type', 'text/html;charset=utf-8')
        response.write(string)
        response.end()
    } else if (path === '/sign_in' && method === 'POST') {
        readBody(request).then((body) => {
            let strings = body.split('&') // ['email=1', 'password=2', 'password_confirmation=3']
            let hash = {}
            strings.forEach((string) => {
                // string == 'email=1'
                let parts = string.split('=') // ['email', '1']
                let key = parts[0]
                let value = parts[1]
                hash[key] = decodeURIComponent(value) // hash['email'] = '1'
            })
            let {
                email,
                password
            } = hash
            var users = fs.readFileSync('./db/users', 'utf8')
            try {
                users = JSON.parse(users) // []
            } catch (exception) {
                users = []
            }
            let found
            for (let i = 0; i < users.length; i++) {
                if (users[i].email === email && users[i].password === password) {
                    found = true
                    break
                }
            }
            if (found) {//验证成功,设置登录Cookie为登录的邮箱,并放在响应里发给浏览器
                response.setHeader('Set-Cookie', `sign_in_email=${email}`)
                response.statusCode = 200
            } else {
                response.statusCode = 401
            }
            response.end()
        })
    } else {
        response.statusCode = 404
        response.setHeader('Content-Type', 'application/json;charset=utf-8')
        response.write(`{
      "error":"404error"
    }`)
        response.end()
    }

    /******** 代码结束，下面不要看 ************/
})

server.listen(port)
console.log('监听 ' + port + ' 成功\n请用在空中转体720度然后用电饭煲打开 http://localhost:' + port)

function readBody(request) { //封装读取请求体的函数
    return new Promise((resolve, reject) => {
        let body = [] //由于http接受数据是一小块一小块接受的,所以我们写代码也需要一块一块的接收,然后拼接在一起
        request.on('data', (chunk) => {
                body.push(chunk)
            })
            .on('end', () => {
                body = Buffer.concat(body).toString();
                resolve(body)
            })
    })
}