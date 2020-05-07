module.exports = function (options = {}, sort = 'Id', page = 1, limit = 20, order = 'asc') {
    const pagination = { page, limit, sort, order };

    if (!isNaN(options.page)) {
        pagination.page = parseInt(options.page);
    }
    if (!isNaN(options.limit)) {
        pagination.limit = parseInt(options.limit);
    }
    if (typeof options.sort === 'string') {
        pagination.sort = options.sort;
    }
    if (typeof options.order === 'string' && ['asc', 'desc'].includes(options.order.toLowerCase())) {
        pagination.order = options.order;
    }

    pagination.offset = (pagination.page - 1) * pagination.limit;

    return pagination;
};
