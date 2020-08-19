/*
 * @Author: fcy
 * @Date: 2020-08-17 11:48:54 
 * @Last Modified time: 2020-08-19 16:12:11
 */
console.log()
var http = require('http');
var querystring = require('querystring');
var pg = require('pg');
var fs = require('fs');
var info = require('../conf/config.json');

/**获得时间 */
var get_Time = () => {
    let date = new Date();
    let year = date.getFullYear();
    let month = date.getMonth()+1;
    let day = date.getDate();
    let hour = date.getHours();
    let minute = date.getMinutes();
    let second = date.getSeconds();
    return {
        ymdhms:year + '-' + month + '-' + day + hour +':'+ minute + ':' + second,
        ymd:year + '-' + month + '-' + day
    }
}
/**错误日志 */
var err_logs = (text) => {
    let time = get_Time();
    fs.open(info.logs.err_log + "err_" + time.ymd + ".log", "a",755, function(err, fd){
        /**写入文件 */
        fs.writeFile(fd, "[" + time.ymdhms + "] " + text + "\n",function(){})
        /**关闭文件 */
        fs.close(fd,function(){})
    });
}
/**查询日志 */
var query_logs = (text) => {
    let time = get_Time();
    fs.open(info.logs.query_log + "query_" + time.ymd + ".log", "a",755, function(err, fd){
        /**写入文件 */
        fs.writeFile(fd, "[" + time.ymdhms + "] " + text + "\n",function(){})
        /**关闭文件 */
        fs.close(fd,function(){})
    });
}

/**安全性日志 */
var safety_logs = (text) => {
    let time = get_Time();
    fs.open(info.logs.safety_log + "safety_" + time.ymd + ".log", "a",755, function(err, fd){
        /**写入文件 */
        fs.writeFile(fd, "[" + time.ymdhms + "] " + text + "\n",function(){})
        /**关闭文件 */
        fs.close(fd,function(){})
    });
}

/**高危sql拦截 */
var sql_intercept = (sql) => {
    for(let i = 0; i < info.sql_intercept.length; i++){
        let re = new RegExp(info.sql_intercept[i]);
        if(re.test(sql)){
            return false;
        }
    }
    return true;
}

/**zabbix状态 */
var zabbix_state = () => {
    let msg = "";
    for(let name in info.pgsql){ 
        for(let i = 0; i < info.pgsql[name].length ; i++){
            let pginfo = info.pgsql[name][i];
            msg = msg + pginfo.info.host + " " + "User[" + name + "][" + i + "]" + " " + pginfo.info.user + "\n";
            msg = msg + pginfo.info.host + " " + "DataBase[" + name + "][" + i + "]" + " " + pginfo.info.database + "\n";
            msg = msg + pginfo.info.host + " " + "Host[" + name + "][" + i + "]" + " " + pginfo.info.host + "\n";
            msg = msg + pginfo.info.host + " " + "Port[" + name + "][" + i + "]" + " " + pginfo.info.port + "\n";
            msg = msg + pginfo.info.host + " " + "PgPool[" + name + "][" + i + "]" + " " + (pginfo.pg ? "online" : "offline") + "\n";
            msg = msg + pginfo.info.host + " " + "DB[" + name + "][" + i + "]" + " " + (pginfo.state ? "ok" : "no") + "\n";
            msg = msg + pginfo.info.host + " " + "Request/s[" + name + "][" + i + "]" + " " + pginfo.request + "\n";
        }
    }
    fs.open(info.tmp.zabbix_tmp + "zabbix.tmp", "w",755, function(err, fd){
        /**写入文件 */
        fs.writeFile(fd, msg,function(){});
        /**关闭文件 */
        fs.close(fd,function(){});
    });
}

/**查询并记录日志 */
var query = (pgPool,sqlStr,success,failure) => {
    pgPool.connect(function (isErr, client, done) {
        if (isErr) {
            /**查询错误 */
            query_logs("状态:[失败] 语句:[" + sqlStr + "]");
            err_logs(isErr.message);
            /**错误码0代表连接层面的错误。 */
            failure({
                code: 0,
                err: isErr.message
            })
            return; 
        }
        client.query(sqlStr, [], function (isErr, rst) {
            done();
            if (isErr) {
                /**查询错误 */
                query_logs("状态:[失败] 语句:[" + sqlStr + "]");
                err_logs(isErr.message);
                /**错误码1是查询层面的错误 */
                failure({
                    code: 1,
                    err: isErr.message
                })
            } else {
                query_logs("状态:[成功] 语句:[" + sqlStr + "]");
                success(rst.rows);
            }
        })
    });
}

/** 获得客户端的访问ip*/
var get_ClientIP = (req) => {
    return req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress;
};

/**清空每分钟请求统计 */
var clean_request = () => {
    for(let name in info.pgsql){  
        for(let i = 0; i < info.pgsql[name].length; i++){
            /**清空每分钟请求计数 */
            info.pgsql[name][i].request = 0;
        }
    } 
}

/**抽取一个运行正常的数据库池,离线状态的不需要 */
var get_pool = (type) => {
    let container = [];
    /**筛选正常连接池 */
    for(let i = 0; i < info.pgsql[type].length; i++){
        /**判断是否可用 */
        if(info.pgsql[type][i].state){
            container.push(info.pgsql[type][i].pg);
        }
    }
    /**随机抽取 */
    if(container.length != 0){
        /**返回一个随机连接池和定位(方便出错时进行离线处理) */
        let key = Math.floor((Math.random() * container.length));
        return {
            key: key,
            pool: container[key]
        }
    }else{
        return false
    }
}

/**上线数据库自动检测挂载 */
var auto_load = () => {
    for(let name in info.pgsql){  
        for(let i = 0; i < info.pgsql[name].length; i++){
            /**找出不可用的数据池 */
            if(!info.pgsql[name][i].state){
                /**尝试重新连接 */
                let pginfo = info.pgsql[name][i]
                info.pgsql[name][i].pg = new pg.Pool(pginfo.info)
                query(info.pgsql[name][i].pg,testSql,function(data){
                    /**重连挂载成功 */
                    info.pgsql[name][i].state = true;
                },function(err){
                    /**重连失败 */
                    err_logs("数据库:[" + info.pgsql[name][i].info.host + "] 用户:[" + info.pgsql[name][i].info.user + "]重新挂载失败!错误信息:[" + err + "]");
                });
            }
        }
    } 
    zabbix_state();
    clean_request();
    setTimeout(auto_load,60000)
}
auto_load();

/**连接池创建*/
for(let name in info.pgsql){  
    for(let i = 0; i < info.pgsql[name].length ; i++){
        let pginfo = info.pgsql[name][i];
        info.pgsql[name][i].pg = new pg.Pool(pginfo.info)
        query(info.pgsql[name][i].pg,"select now()",function(){
            /**启动成功 */
        },function(err){
            err_logs("数据库:" + pginfo.info.host + " 用户:" + pginfo.info.user + " 数据库连接池创建失败!错误信息:" + err);
        });
    } 
    zabbix_state();
}

http.createServer(function (req, res) {
    /** 获得客户端ip*/
    var ip = get_ClientIP(req);
    /** 权限判断*/
    if(info.whitelist.indexOf(ip) == -1){
        safety_logs("非名单内IP尝试访问,IP:" + ip + ",已阻止!")
        res.end();
        return false
    }

    let body = "";
    req.on('data', function (chunk) {
        body += chunk;
    });

    req.on('end', function () {
        /** 解析参数*/
        body = querystring.parse(body);
        /** 获得数据*/
        if(body.sql && body.sgin && body.type) {
            /**sql审计 */
            if(!sql_intercept(body.sql)){
                safety_logs("拦截了一条高危SQL,IP:[" + ip + "],SQL:[" + body.sql + "]");
                res.end();
                return false;
            }
            /**密匙验证 */
            if(body.sgin != info.sgin){
                safety_logs("sgin错误,请求被拒绝,IP:" + ip)
                res.end();
                return false
            }
            /**获取一个pool */
            let pgPool = get_pool(body.type);
            /**没有获取到pool */
            if(!pgPool.pool){
                err_logs("无法获取到pool,请检查数据库!");
                res.end();
                return false
            }
            /**执行 */
            query(pgPool.pool,body.sql,(data) => {
                /**请求计数 */
                info.pgsql[body.type][pgPool.key].request = info.pgsql[body.type][pgPool.key].request + 1;
                /** 设置响应头部信息及编码*/
                res.writeHead(200, {'Content-Type': 'text/plain; charset=utf-8'});
                res.write(JSON.stringify({state:true,pool:pgPool.key,type:body.type,data:data}));
                res.end();
                return false
            },(err) => {
                /**0的话连接失败,将pool从可用队列中剔除 */
                if(err.code == 0){
                    info.pgsql[body.type][pgPool.key].state = false;
                    err_logs("数据库:[" + info.pgsql[body.type][pgPool.key].info.host + "] 用户:[" + info.pgsql[body.type][pgPool.key].info.user + "]已离线!");
                    res.end();
                    return false
                }
                /**1的话语句查询失败,可能语句存在错误*/
                if(err.code == 1){
                    res.end();
                    return false
                }
            })
        }else{
            res.end();
            return false
        }
    });

}).listen(info.server.port,info.server.host);

