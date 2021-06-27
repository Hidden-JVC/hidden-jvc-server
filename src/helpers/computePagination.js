module.exports = function (page, limit, maxLimit = null) {
    if (typeof page === 'string' && page.length > 0 && !isNaN(page)) {
        page = parseInt(page);
    } else {
        page = 1;
    }

    if (typeof limit === 'string' && limit.length > 0 && !isNaN(limit)) {
        limit = parseInt(limit);
    } else {
        limit = 20;
    }

    if (maxLimit !== null && limit > maxLimit) {
        limit = maxLimit;
    }

    const offset = (page - 1) * limit;

    return { offset, limit };
};
