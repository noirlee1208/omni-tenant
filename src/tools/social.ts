import { TwitterApi } from 'twitter-api-v2';
import { getEnvOrAlert } from '../utils/env';

export async function postTweet(content: string): Promise<string> {
    try {
        // Kiểm tra xem Boss đã cung cấp đủ chìa khóa chưa
        const appKey = await getEnvOrAlert('TWITTER_API_KEY', 'Agent muốn Lùa gà trên Twitter nhưng thiếu API Key.');
        const appSecret = await getEnvOrAlert('TWITTER_API_SECRET', 'Thiếu Twitter API Secret.');
        const accessToken = await getEnvOrAlert('TWITTER_ACCESS_TOKEN', 'Thiếu Twitter Access Token.');
        const accessSecret = await getEnvOrAlert('TWITTER_ACCESS_SECRET', 'Thiếu Twitter Access Secret.');

        if (!appKey || !appSecret || !accessToken || !accessSecret) {
            return "Thất bại: Boss chưa cấp đủ quyền truy cập Twitter API. Đã thông báo cho Boss.";
        }

        console.log(`\n🐦 [TWITTER ACTION] Đang đăng tải: "${content}"`);
        
        const client = new TwitterApi({
            appKey,
            appSecret,
            accessToken,
            accessSecret,
        });

        // Sử dụng quyền Read/Write
        const rwClient = client.readWrite;
        
        // Đăng Tweet
        const { data } = await rwClient.v2.tweet(content);
        
        console.log(`✅ [TWITTER SUCCESS] Đăng thành công! Tweet ID: ${data.id}`);
        return `Đã đăng Tweet thành công! ID: ${data.id}`;
        
    } catch (error: any) {
        console.error(`❌ [TWITTER ERROR] Không thể đăng bài:`, error.message);
        return `Đăng Tweet thất bại: ${error.message}`;
    }
}
