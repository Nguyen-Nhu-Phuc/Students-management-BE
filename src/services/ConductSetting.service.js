const ConductSetting = require("../models/ConductSetting");

const createConductSetting = async (data) => {
    try {
        const { name, displayName, semester, status } = data;

        if (!name || !displayName || !semester) {
            throw new Error("Thiếu thông tin bắt buộc: name, displayName hoặc semester");
        }

        // Kiểm tra trùng name trong cùng semester
        const existed = await ConductSetting.findOne({ name, semester });
        if (existed) {
            throw new Error("Đã có thiết lập với cùng tên trong học kỳ này");
        }

        const newItem = new ConductSetting({ name, displayName, semester, status });
        const saved = await newItem.save();
        return saved;
    } catch (error) {
        throw new Error(error.message || "Không thể tạo ConductSetting");
    }
};

const getAllConductSettings = async ({ limit, offset }) => {
    try {
        const queryLimit = parseInt(limit) || 50;
        const queryOffset = parseInt(offset) || 0;

        const data = await ConductSetting.find()
            .skip(queryOffset)
            .limit(queryLimit)
            .sort({ createdAt: -1 });

        const total = await ConductSetting.countDocuments();
        return { total, items: data };
    } catch (error) {
        throw new Error(error.message || "Không thể lấy danh sách ConductSetting");
    }
};

const getActiveConductSettings = async () => {
    try {
        const order = ["EXCELLENT", "GOOD", "AVERAGE", "BELOW_AVERAGE"];
        const items = await ConductSetting.find({ status: "active" });
        items.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
        return items;
    } catch (error) {
        throw new Error(error.message || "Không thể lấy danh sách loại hạnh kiểm active");
    }
};

const getOneConductSetting = async (id) => {
    try {
        if (!id) throw new Error("Thiếu id");
        const item = await ConductSetting.findById(id);
        if (!item) throw new Error("Không tìm thấy ConductSetting");
        return item;
    } catch (error) {
        throw new Error(error.message || "Không thể lấy ConductSetting");
    }
};

const updateConductSetting = async (id, data) => {
    try {
        if (!id) throw new Error("Thiếu id");

        const { name, semester } = data;
        // Nếu thay đổi name hoặc semester thì kiểm tra trùng
        if (name && semester) {
            const existed = await ConductSetting.findOne({ name, semester, _id: { $ne: id } });
            if (existed) {
                throw new Error("Đã có thiết lập với cùng name trong học kỳ này");
            }
        } else if (name && !semester) {
            // Nếu chỉ đổi name, cần lấy semester hiện tại của tài liệu
            const current = await ConductSetting.findById(id);
            if (!current) throw new Error("Không tìm thấy ConductSetting");
            const existed = await ConductSetting.findOne({ name, semester: current.semester, _id: { $ne: id } });
            if (existed) {
                throw new Error("Đã có thiết lập với cùng name trong học kỳ này");
            }
        } else if (!name && semester) {
            // Nếu chỉ đổi semester
            const current = await ConductSetting.findById(id);
            if (!current) throw new Error("Không tìm thấy ConductSetting");
            const existed = await ConductSetting.findOne({ name: current.name, semester, _id: { $ne: id } });
            if (existed) {
                throw new Error("Đã có thiết lập với cùng name trong học kỳ này");
            }
        }

        const updated = await ConductSetting.findByIdAndUpdate(id, data, { new: true });
        if (!updated) throw new Error("Không tìm thấy ConductSetting để cập nhật");
        return updated;
    } catch (error) {
        throw new Error(error.message || "Không thể cập nhật ConductSetting");
    }
};

const deleteConductSetting = async (id) => {
    try {
        if (!id) throw new Error("Thiếu id");
        const removed = await ConductSetting.findByIdAndDelete(id);
        if (!removed) throw new Error("Không tìm thấy ConductSetting để xóa");
        return removed;
    } catch (error) {
        throw new Error(error.message || "Không thể xóa ConductSetting");
    }
};

module.exports = {
    createConductSetting,
    getAllConductSettings,
    getOneConductSetting,
    updateConductSetting,
    deleteConductSetting,
    getActiveConductSettings,
};
