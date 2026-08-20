import React from "react";
import { CATEGORIES, getSubCategories } from "./sportCategories";

const selectClass = (hasError) =>
  `w-full min-h-[48px] text-base rounded-xl border ${
    hasError ? "border-red-500" : "border-gray-200"
  } bg-white px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-gray-50 disabled:text-gray-400`;

const CategoryFields = ({
  category = "",
  subCategory = "",
  onCategoryChange,
  onSubCategoryChange,
  categoryError,
  subCategoryError,
  categoryLabel = "Category",
  subCategoryLabel = "Sport / Subcategory",
  required = true,
}) => {
  const subs = getSubCategories(category);

  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium text-gray-800 mb-1.5 block">
          {categoryLabel}
          {required && <span className="text-red-500"> *</span>}
        </label>
        <select
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
          className={selectClass(categoryError)}
        >
          <option value="">Select category</option>
          {CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        {categoryError && (
          <p className="text-red-500 text-xs mt-1">{categoryError}</p>
        )}
      </div>

      <div>
        <label className="text-sm font-medium text-gray-800 mb-1.5 block">
          {subCategoryLabel}
          {required && <span className="text-red-500"> *</span>}
        </label>
        <select
          value={subCategory}
          disabled={!category}
          onChange={(e) => onSubCategoryChange(e.target.value)}
          className={selectClass(subCategoryError)}
        >
          <option value="">
            {category ? "Select sport" : "Select category first"}
          </option>
          {subs.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        {subCategoryError && (
          <p className="text-red-500 text-xs mt-1">{subCategoryError}</p>
        )}
      </div>
    </div>
  );
};

export default CategoryFields;
