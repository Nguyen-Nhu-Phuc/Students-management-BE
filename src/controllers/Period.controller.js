const periodService = require("../services/Period.service");

const createPeriodController = async (req, res) => {
    try {

        const { data } = req.body

        const period = await periodService.createPeriod({ data })

        return res.status(200).json({
            message: "Thêm số tiết thành công",
            data: period,
        });

    }
    catch (err) {
        return res.status(400).json({
            message: "Không thể tạo số tiết",
            error: err.message,
        });
    }
}


const updatePeriodController = async (req, res) => {
    try {
        const { id } = req.params
        const { data } = req.body

        const period = await periodService.updatePeriod({ id, data })

        return res.status(200).json({
            message: "Cập nhật số tiết thành công",
            data: period,
        });
    }
    catch (err) {
        return res.status(400).json({
            message: "Không thể cập nhật số tiết",
            error: err.message,
        });
    }
}

const getAllPeriodController = async (req, res) => {
    try {
        const { limit, offset } = req.body;

        const result = await periodService.getAllPeriodService({ limit, offset });

        return res.status(200).json(result);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};


const getOnePeriodController = async (req, res) => {
    try {

        const { id } = req.params

        const period = await periodService.getOnePeriodService({ id })

        return res.status(200).json(period)

    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }

}

const deletePeriodController = async (req, res) => {
    try {

        const { id } = req.params

        const period = await periodService.deletePeriod({ id })

        return res.status(200).json(period)

    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }

}


module.exports = {
    createPeriodController,
    updatePeriodController,
    getAllPeriodController,
    getOnePeriodController,
    deletePeriodController
};

