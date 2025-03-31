import axios from "axios";
import {JSDOM} from "jsdom";

import { generateABogus,get_fp,get_ms_token } from "./ab_192.js"

class CommonUtils {
    constructor() {
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36';
    }

    async getTtwidWebid(reqUrl) {
        try {
            const response = await axios.get(reqUrl, {
                headers: {
                    'User-Agent': this.userAgent,
                    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
                },
                validateStatus: () => true
            });

            // 提取 Cookie 中的 ttwid
            const cookies = response.headers['set-cookie'] || [];
            const ttwidCookie = cookies.find(c => c.startsWith('ttwid='));
            const ttwid = ttwidCookie ? ttwidCookie.split(';')[0].split('=')[1] : null;

            // 解析 RENDER_DATA
            const dom = new JSDOM(response.data);
            const scriptContent = dom.window.document.querySelector('script#RENDER_DATA').textContent;
            const decodedData = decodeURIComponent(scriptContent);
            const renderData = JSON.parse(decodedData);

            return {
                ttwid: ttwid,
                webid: renderData?.app?.odin?.user_unique_id
            };
        } catch (error) {
            console.error('Error in getTtwidWebid:', error.message);
            throw error;
        }
    }
}

class DyComment {
    constructor() {
        this.commonUtils = new CommonUtils();
        this.commentListHeaders = {
            'sec-ch-ua': '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
            'Accept': 'application/json, text/plain, */*',
            'sec-ch-ua-mobile': '?0',
            'User-Agent': this.commonUtils.userAgent,
            'sec-ch-ua-platform': '"Windows"',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Dest': 'empty',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
        };
    }

    async getCommentList(reqUrl) {
        try{

            const searchParams = new URLSearchParams(new URL(reqUrl).search);
            const aweme_id = searchParams.get('modal_id');


            const refererUrl = `https://www.douyin.com/discover?modal_id=${aweme_id}`;

            const { ttwid, webid } = await this.commonUtils.getTtwidWebid(refererUrl);
            const msToken = get_ms_token();
            const fp = get_fp();

            let requestUrl = `https://www.douyin.com/aweme/v1/web/comment/list/?device_platform=webapp&aid=6383&channel=channel_pc_web&aweme_id=${aweme_id}&cursor=0&count=20&item_type=0&insert_ids=&whale_cut_token=&cut_version=1&rcFT=&update_version_code=170400&pc_client_type=1&version_code=170400&version_name=17.4.0&cookie_enabled=true&screen_width=1920&screen_height=1080&browser_language=zh-CN&browser_platform=Win32&browser_name=Chrome&browser_version=123.0.0.0&browser_online=true&engine_name=Blink&engine_version=123.0.0.0&os_name=Windows&os_version=10&cpu_core_num=16&device_memory=8&platform=PC&downlink=10&effective_type=4g&round_trip_time=50&webid=${webid}&verifyFp=${fp}&fp=${fp}&msToken=${msToken}`;
            const a_bogus = generateABogus(refererUrl,null,...this.commonUtils.userAgent);

            requestUrl+=`&a_bogus=${a_bogus}`
            const response = await axios.get(requestUrl, {
                headers: {
                    ...this.commentListHeaders,
                    Referer: refererUrl,
                    Cookie: `ttwid=${ttwid};`
                }
            });

            if (response.data) {
                const data = response.data;
                const total = data.total;
                const comments = data.comments || [];

                comments.forEach(comment => {
                    console.log(`爬取成功：${comment.user.nickname}：${comment.text}`);
                });

                if (comments.length === 0) {
                    console.log(`爬取结束：评论数=${total}`);
                }
            }


        }catch(error){
            console.log(error);
        }
    }
}



(async () => {
    const reqUrl = 'https://www.douyin.com/discover?modal_id=7258913772092296485';
    const dyComment = new DyComment();
    await dyComment.getCommentList(reqUrl);
})();