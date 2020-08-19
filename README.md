# easy-pg
## 一个基于Nodejs的Pg数据库简单中间件
它可以
+ 对数据库的请求进行负载均衡
+ 依靠pm2与nginx可以实现到线程级的负载均衡
+ ip请求白名单,自定义正则过滤高危sql
+ 定时导出可以被Zabbix直接推送使用的状态数据
+ 可以输出请求日志,安全日志,错误日志
+ 自动下线故障数据库,自动上线恢复正常的数据库
它的不足
+ 不支持分库分表
+ 数据库需要用户自己部署
+ 性能并不是很高
+ 只支持http方式的调用
+ 防注入功能不够强大,需要用户在逻辑层在进行处理
.......
# 安装
下载安装包后解压,运行install.sh
```
./install.sh 
正在获取目录路径.....
程序目录为:/usr/local/luobo/easy_pg
准备检测程序及依赖....
/usr/local/luobo/easy_pg/src/node_modules/pm2/bin/pm2
/usr/local/luobo/easy_pg/src/easy_pg.js
/usr/local/luobo/easy_pg/nodejs/bin/node
/usr/local/luobo/easy_pg/easy_pg
主程序easy_pg.js存在,路径为/usr/local/luobo/easy_pg/src/easy_pg.js
依赖pm2存在,路径为/usr/local/luobo/easy_pg/src/node_modules/pm2/bin/pm2
准备生成启动文件!
启动文件生成成功!
程序将建立软连接....
软连接pm2已存在,准备删除重建立...
删除成功!
软连接node已存在,准备删除重建立...
删除成功!
软连接easy_pg已存在,准备删除重建...
删除成功!
程序软连接创建成功!
程序部署成功!
以下为easy_pg参数列表
easy_pg start         启动
easy_pg stop          停止
easy_pg restart       重启
easy_pg reload        重载
easy_pg state         状态
easy_pg list          各线程信息
easy_pg help          帮助
[root@PostgreSql01 easy_pg]# 

```
当出现命令参数列表时就表示安装完成
输入以下命令启动
```
easy_pg start
```
当然,目前未设置配置文件,启动完成后也无法进行服务
配置表在软件安装目录下conf文件下的config.json文件内
以下为配置文件内容说明
```
{
    "server":{
        //服务端口号
        "port":3000,
        //服务IP
        "host":"0.0.0.0"
    },
    //请求白名单IP,不在列表中的IP无法访问
    "whitelist":[
        "10.10.10.1",
        "10.10.10.2"
    ],
    //各个日志的路径目录,请定时留意剩余磁盘空间,查询日志增长速度会非常快。
    "logs":{
        "err_log":"xxxxxxx/logs/",
        "query_log":"xxxxxxx/logs/",
        "safety_log":"xxxxxxx/logs/"
    },
    //临时文件,该文件直接推送到Zabbix即可监控服务状态
    "tmp":{
        "zabbix_tmp":"/usr/local/luobo/easy_pg/tmp/"
    },
    //pg数据库连接参数,根据数据库数量和功能自由添加
    "pgsql":{
        //读
        "r":[
            {
                //数据库池挂载状态,这里不需要进行更改
                "state":true,
                //pg数据库池对象的存放容器,这里不需要进行更改
                "pg":null,
                //每秒请求数,不需要进行更改
                "request": 0,
                "info":{
                    "user": "用户名",
                    "database": "数据库",
                    "password": "密码",
                    "host": "10.10.10.20",
                    "port": "5432"
                }
            },
            {
                "state":true,
                "pg":null,
                "request": 0,
                "info":{
                    "user": "用户名",
                    "database": "数据库",
                    "password": "密码",
                    "host": "10.10.10.20",
                    "port": "5432"
                }
            },
            {
                "state":true,
                "pg":null,
                "request": 0,
                "info":{
                    "user": "用户名",
                    "database": "数据库",
                    "password": "密码",
                    "host": "10.10.10.20",
                    "port": "5432"
                }
            }
        ],
        //写
        "w":[
            {
                "state":true,
                "pg":null,
                "request": 0,
                "info":{
                    "user": "用户名",
                    "database": "数据库",
                    "password": "密码",
                    "host": "10.10.10.20",
                    "port": "5432"
                }
            }
        ],
        //读写
        "rw":[
            {
                "state":true,
                "pg":null,
                "request": 0,
                "info":{
                    "user": "用户名",
                    "database": "数据库",
                    "password": "密码",
                    "host": "10.10.10.20",
                    "port": "5432"
                }
            }
        ]
    },
    //连接口令,如果不正确无法进行连接
    "sgin":"nN23SMQedBu1VaB3tB98r7Qx1UfWNBFmzHat3euafbTO6jGcUvPSMR7kO6Na",
   //正则匹配高危sql
   "sql_intercept":[

    ]
}
```
配置完成后启动
用POST方式提交数据格式为
sql=你需要提交的sql&sign=连接口令&type=操作方式(r,w,rw)

命令说明
```
easy_pg start         启动
easy_pg stop          停止
easy_pg restart       重启
easy_pg reload        重载
easy_pg state         状态
easy_pg list          各线程信息
easy_pg help          帮助
```
