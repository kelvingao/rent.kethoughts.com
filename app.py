#!/usr/bin/env python3
#
# MIT License
#
# Copyright (c) 2019 Kelvin Gao
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in all
# copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.

import os
import tornado.ioloop
import tornado.web
import tornado.locks
import requests
import csv

from bs4 import BeautifulSoup
from utils import createLogger

logger = createLogger(__name__)


class Application(tornado.web.Application):
    def __init__(self):
        handlers = [
            (r"/", self.IndexHandler),
            (r"/data", self.DataHander)
        ]
        settings = dict(
            sleight_title=u"Sleight Quant",
            template_path=os.path.join(os.path.dirname(__file__), "templates"),
            static_path=os.path.join(os.path.dirname(__file__), "static"),
            debug=True,
        )
        super(Application, self).__init__(handlers, **settings)

    class BaseHandler(tornado.web.RequestHandler):
        pass

    class IndexHandler(BaseHandler):
        def get(self):
            # 每次调用index.html都进行最新的爬取
            self.render("index.html")

    class DataHander(BaseHandler):
        def get(self):
            self.write(',王庄路27号院,,')


async def crawlRent2csv():
    bj58_url = 'https://bj.58.com/shangpucz/pn{page}'
    page = 0

    csv_file = open('static/bj58.csv', 'w')
    csv_writer = csv.writer(csv_file, delimiter=',')

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36',
        'Connection': 'keep-alive'
    }

    while True:
        page += 1
        # loggger.info
        logger.info('下载网页: %s', bj58_url.format(page=page))

        # request params：明火，面积60-70平米
        params = {'tese': '15', 'sq': '1', 'area': '60_70'}

        res = requests.get(bj58_url.format(page=page), params=params, headers=headers)
        html = BeautifulSoup(res.content, "lxml")

        house_list = html.find('ul', {'class', 'house-list-wrap'})

        # 退出条件
        if not house_list:
            break

        # 获取所有的出租条目
        house_list = house_list.find_all('li')

        for house in house_list:
            # 店铺租赁标题
            house_title = house.find('span', {'class', 'title_des'}).get_text()
            # 店铺详情链接
            house_url = house.find('h2', {'class', 'title'}).a['href']
            # 店铺位置
            house_location = house.find('p', {'class', 'baseinfo'}).next_sibling.next_sibling.find_all('span')[1].get_text()
            # 店铺租金
            house_money = house.find('b').get_text()
            # 写入csv文件
            csv_writer.writerow([house_title, house_location, house_money, house_url])

    csv_file.close()


async def main():
    # 服务器启动之前爬数据，不影响服务，只影响服务的启动速度
    # TODO: 加入每天夜里的调用例程，刷新数据
    await crawlRent2csv()

    app = Application()
    app.listen(8000)

    logger.info("http://127.0.0.1:8000")
    logger.info("Press Ctrl+C to quit")

    # In this demo the server will simply run until interrupted
    # with Ctrl-C, but if you want to shut down more gracefully,
    # call shutdown_event.set().
    shutdown_event = tornado.locks.Event()
    await shutdown_event.wait()


if __name__ == '__main__':
    tornado.ioloop.IOLoop.current().run_sync(main)
