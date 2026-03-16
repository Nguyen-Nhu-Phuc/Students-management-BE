const conductService = require("../services/ConductSetting.service");

const handleCreateConduct = async (req, res) => {
    try {
        const data = req.body;
        const created = await conductService.createConductSetting(data);
        return res.status(201).json({ message: "Tạo loại hạnh kiểm thành công", data: created });
    } catch (error) {
        return res.status(400).json({ message: "Không thể tạo loại hạnh kiểm", error: error.message });
    }
};

const handleGetAllConduct = async (req, res) => {
    try {
        const { limit, offset } = req.body || {};
        const result = await conductService.getAllConductSettings({ limit, offset });
        return res.status(200).json({ message: "Lấy danh sách thành công", total: result.total, data: result.items });
    } catch (error) {
        return res.status(500).json({ message: "Không thể lấy danh sách loại hạnh kiểm", error: error.message });
    }
};

const handleGetOneConduct = async (req, res) => {
    try {
        const item = await conductService.getOneConductSetting(req.params.id);
        return res.status(200).json(item);
    } catch (error) {
        return res.status(404).json({ message: "Không tìm thấy loại hạnh kiểm", error: error.message });
    }
};

const handleUpdateConduct = async (req, res) => {
    try {
        const updated = await conductService.updateConductSetting(req.params.id, req.body);
        return res.status(200).json({ message: "Cập nhật thành công", data: updated });
    } catch (error) {
        return res.status(400).json({ message: "Không thể cập nhật loại hạnh kiểm", error: error.message });
    }
};

const handleDeleteConduct = async (req, res) => {
    try {
        await conductService.deleteConductSetting(req.params.id);
        return res.status(200).json({ message: "Xóa thành công" });
    } catch (error) {
        return res.status(400).json({ message: "Không thể xóa loại hạnh kiểm", error: error.message });
    }
};

const handleGetActiveConduct = async (req, res) => {
    try {
        const items = await conductService.getActiveConductSettings();
        return res.status(200).json({ message: "Lấy danh sách loại hạnh kiểm thành công", data: items });
    } catch (error) {
        return res.status(500).json({ message: "Không thể lấy danh sách loại hạnh kiểm", error: error.message });
    }
};

module.exports = {
    handleCreateConduct,
    handleGetAllConduct,
    handleGetOneConduct,
    handleUpdateConduct,
    handleDeleteConduct,
    handleGetActiveConduct,
};
