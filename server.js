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
            } else {//存入db中的users数据库
                var users = fs.readFileSync('./db/users', 'utf8')
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
                    var usersString = JSON.stringify(users)
                    fs.writeFileSync('./db/users', usersString)
                    response.statusCode = 200
                }
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