import React from "react";
import UserInfoField from "components/ui/UserInfoField";
import Button from "components/ui/Button";

const UserInfo = ({
  userData,
  fields,
  texts,
  onEditClick,
  renderPasswordStatus,
  showFeatures = false,
  showEditButton = false,
}) => {
  return (
    <div className="bg-white shadow rounded-lg p-6 space-y-4">
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
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rakusai-pink-light text-white"
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
      <div className="flex w-full">
        {showEditButton && (
          <Button
            onClick={onEditClick}
            variant="primary"
            className="inline-flex items-center justify-center w-full px-2 py-1.5 text-sm font-semibold h-10"
          >
            {texts.button.edit}
          </Button>
        )}
      </div>
    </div>
  );
};

UserInfo.displayName = "UserInfo";

export default UserInfo;
