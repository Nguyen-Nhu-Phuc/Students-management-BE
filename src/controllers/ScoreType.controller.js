
const scoreTypeService = require("../services/ScoreSetting.service");

const getAllScoreTypeController = async (req, res) => {
    try {
        const { limit, offset } = req.body;
        const result = await scoreTypeService.getAllScoreTypeService({ limit, offset });
        return res.status(200).json(result);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

const createScoreTypeController = async (req, res) => {
    try {

        const { name, displayName, defaultCoefficient, semester } = req.body

        const scoreType = await scoreTypeService.createScoreType({ name, displayName, defaultCoefficient, semester })

        return res.status(200).json({
            message: "Thêm loại điểm thành công",
            data: scoreType,
        });

    }
    catch (err) {
        return res.status(400).json({
            message: "Không thể tạo loại điểm",
            error: err.message,
        });
    }
}

const editScoreTypeController = async (req, res) => {
    try {
        const { id } = req.params
        const { name, displayName, defaultCoefficient, semester, status } = req.body
        const scoreType = await scoreTypeService.editScoreType({ id, name, displayName, defaultCoefficient, semester, status })

        return res.status(200).json({
            message: "Cập nhật loại điểm thành công",
            data: scoreType,
        });
    }
    catch (err) {
        return res.status(400).json({
            message: "Không thể cập nhật loại điểm",
            error: err.message,
        });
    }
}

const syncScoreTypesController = async (req, res) => {
    try {

        const { subjectId, classId } = req.body;

        if (!classId) {
            return res.status(400).json({
                message: "Thiếu ID lớp học"
            });
        }

        if (!subjectId) {
            return res.status(400).json({
                message: "Thiếu ID môn học"
            });
        }

        const result = await scoreTypeService.syncScoreTypesService(classId, subjectId);
        return res.status(200).json({
            message: "Đồng bộ loại điểm thành công",
            data: result,
        });
    } catch (err) {
        return res.status(500).json({
            message: "Lỗi khi đồng bộ điểm",
            error: err.message
        });
    }
};



module.exports = {
    createScoreTypeController,
    getAllScoreTypeController,
    editScoreTypeController,
    syncScoreTypesController,

}