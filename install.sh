#!/bin/bash
if [ ! -f 'install.sh' ];then
  echo "请cd到install文件目录下安装!"
  exit 1
fi
echo "正在获取目录路径....."
#获得路径
dir=$(pwd)

echo "程序目录为:$dir"
echo "准备检测程序及依赖...."
#pm2路径
pm2=$dir'/src/node_modules/pm2/bin/pm2'
echo $pm2

#主程序文件路径
code=$dir'/src/easy_pg.js'
echo $code

#node路径
node=$dir'/nodejs/bin/node'
echo $node

#启动程序路径
i=$dir'/easy_pg'
echo $i

#判断主程序文件是否存在
if [ ! -f $node ];then
  echo "缺失必须库nodejs"
  exit 1
fi

#判断主程序文件是否存在
if [ ! -f $code ];then
  echo "缺失主程序文件easy_pg.js"
  exit 1
fi

echo "主程序easy_pg.js存在,路径为$code"

#判断pm2是否存在
if [ ! -f $pm2 ];then
  echo "缺失pm2文件"
  exit 1
fi

echo "依赖pm2存在,路径为$pm2"
echo "准备生成启动文件!"
#生成启动文件
echo "#!/bin/bash
#启动
if [ \$1 = 'start' ];then
    pm2 start $code -n easy_pg
fi
#关闭
if [ \$1 = 'stop' ];then
    pm2 stop $code
fi
#重启
if [ \$1 = 'restart' ];then
    pm2 restart $code
fi
#重载
if [ \$1 = 'reload' ];then
    pm2 reload $code
fi
#状态
if [ \$1 = 'state' ];then
    #pm2 show easy_pg
    pm2 monit easy_pg
fi
#列表
if [ \$1 = 'list' ];then
    pm2 show easy_pg
    pm2 list
fi
#帮助
if [ \$1 = 'help' ];then
    echo '以下为easy_pg参数列表'
    echo 'easy_pg start		启动'
    echo 'easy_pg stop		停止'
    echo 'easy_pg restart		重启'
    echo 'easy_pg reload		重载'
    echo 'easy_pg state		状态'
    echo 'easy_pg list		各线程信息'
    echo 'easy_pg help		帮助'
fi
" > $i
chmod +x $i
echo "启动文件生成成功!"
echo "程序将建立软连接...."
a='/usr/bin/pm2'
b='/usr/bin/easy_pg'
c='/usr/bin/node'

if [ -f $a ];then
  echo "软连接pm2已存在,准备删除重建立..."
  rm -rf $a
  echo "删除成功!"
fi

if [ -f $c ];then
  echo "软连接node已存在,准备删除重建立..."
  rm -rf $c
  echo "删除成功!"
fi

if [ -f $b ];then
  echo "软连接easy_pg已存在,准备删除重建..."
  rm -rf $b
  echo "删除成功!"
fi

ln -s $pm2 $a
ln -s $i $b
ln -s $node $c
echo "程序软连接创建成功!"
echo "程序部署成功!"
echo '以下为easy_pg参数列表'
echo 'easy_pg start         启动'
echo 'easy_pg stop          停止'
echo 'easy_pg restart       重启'
echo 'easy_pg reload        重载'
echo 'easy_pg state         状态'
echo 'easy_pg list          各线程信息'
echo 'easy_pg help          帮助'
