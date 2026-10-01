import incomeModel from "../models/incomeModel.js";
import XLSX from "xlsx";
import getDateRange from "../utils/dateFilter.js";

// ✅ ADD INCOME
export async function addIncome(req, res) {
  const userId = req.user._id;
  const { description, amount, category, date } = req.body;

  try {
    if (!description || !amount || !category || !date) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const newIncome = new incomeModel({
      userId,
      description,
      amount,
      category,
      date: new Date(date), // ✅ FIXED
    });

    await newIncome.save();

    res.status(201).json({
      success: true, // ✅ FIXED
      message: "Income added successfully",
      data: newIncome,
    });
  } catch (error) {
    console.error("Add Income Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

// ✅ GET ALL INCOME
export async function getAllIncome(req, res) {
  const userId = req.user._id;

  try {
    const income = await incomeModel.find({ userId }).sort({ date: -1 }); // ✅ FIXED

    res.json({
      success: true,
      data: income,
    }); // ✅ FIXED
  } catch (error) {
    console.error("Get Income Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

// ✅ UPDATE INCOME
export async function updateIncome(req, res) {
  const { id } = req.params;
  const userId = req.user._id;
  const { description, amount, category, date } = req.body;

  try {
    const updatedIncome = await incomeModel.findOneAndUpdate(
      { _id: id, userId },
      { description, amount, category, date },
      { new: true }
    );

    if (!updatedIncome) { // ✅ FIXED
      return res.status(404).json({
        success: false,
        message: "Income not found",
      });
    }

    res.json({
      success: true,
      message: "Income updated successfully",
      data: updatedIncome, // ✅ FIXED
    });
  } catch (error) {
    console.error("Update Income Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

// ✅ DELETE INCOME
export async function deleteIncome(req, res) {
  try {
    const income = await incomeModel.findByIdAndDelete(req.params.id);

    if (!income) {
      return res.status(404).json({
        success: false,
        message: "Income not found",
      });
    }

    return res.json({ // ✅ FIXED
      success: true,
      message: "Income deleted successfully",
    });
  } catch (error) {
    console.error("Delete Income Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

// ✅ DOWNLOAD EXCEL
export async function downloadIncomeExcel(req, res) {
  const userId = req.user._id;

  try {
    const income = await incomeModel.find({ userId }).sort({ date: -1 });

    const plainData = income.map((inc) => ({
      Description: inc.description,
      Amount: inc.amount,
      Category: inc.category,
      Date: new Date(inc.date).toLocaleDateString(),
    }));

    const worksheet = XLSX.utils.json_to_sheet(plainData);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Income");

    XLSX.writeFile(workbook, "income_details.xlsx");

    res.download("income_details.xlsx");
  } catch (error) {
    console.error("Download Excel Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

// ✅ INCOME OVERVIEW
export async function getIncomeOverview(req, res) {
  try {
    const userId = req.user._id;
    const { range = "monthly" } = req.query;
    const { start, end } = getDateRange(range);

    const incomes = await incomeModel.find({
      userId,
      date: { $gte: start, $lte: end },
    }).sort({ date: -1 });

    const totalIncome = incomes.reduce((acc, cur) => acc + cur.amount, 0);
    const averageIncome =
      incomes.length > 0 ? totalIncome / incomes.length : 0;
    const numberOfTransactions = incomes.length;
    const recentTransactions = incomes.slice(0, 5);

    res.json({
      success: true,
      data: {
        totalIncome,
        averageIncome,
        numberOfTransactions,
        recentTransactions,
        range,
      },
    });
  } catch (error) {
    console.error("Income Overview Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}