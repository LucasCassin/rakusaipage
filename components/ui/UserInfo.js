import React from "react";
import UserInfoField from "components/ui/UserInfoField";
import Button from "components/ui/Button";

const UserInfo = ({
  userData,
  fields,
  texts,
  onEditClick,
  renderPasswordStatus,
  showFeatures = true,
}) => {
  return (
    <div className="bg-white shadow rounded-lg p-6 space-y-4">
      <div className="flex w-full sm:justify-between sm:items-center flex-col sm:flex-row text-center">
        <h3 className="text-lg font-medium text-gray-900">
          {texts.userInfoTitle}
        </h3>
        <Button
          onClick={onEditClick}
          variant="primary"
          className="inline-flex items-center px-2 py-1.5 text-sm font-semibold h-10 mt-2 sm:mt-0"
        >
          {texts.button.edit}
        </Button>
      </div>
      <div className="space-y-3">
        {fields.map((field, index) => (
          <UserInfoField
            key={index}
            label={field.label}
            value={field.value}
            formatValue={field.format}
          />
        ))}
        {renderPasswordStatus}
      </div>
      {showFeatures && (
        <div>
          <h4 className="text-base font-medium text-gray-900 mb-2">
            {texts.featuresTitle}
          </h4>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-1 gap-2 max-h-[180px] min-h-[120px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
              {userData.features.map((feature) => (
                <span
                  key={feature}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rakusai-purple-light text-rakusai-purple"
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

UserInfo.displayName = "UserInfo";

export default UserInfo;
