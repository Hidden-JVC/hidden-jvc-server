const database = require('../database.js');

module.exports = class HiddenController {
    static async deleteNotifications(data) {
        const query = database('QuoteNotification');

        if (Array.isArray(data.notifications)) {

            for (const notification of data.notifications) {
                if (typeof notification.userId === 'number' && typeof notification.hiddenPostId === 'number') {
                    if (notification.userId !== data.userId) {
                        continue;
                    }
                    query.orWhere(function () {
                        this.where('UserId', '=', notification.userId);
                        this.andWhere('HiddenPostId', '=', notification.hiddenPostId);
                    });
                }
            }
        }

        await query.del();
    }
};
