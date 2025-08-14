import { useCallback } from "react";
import availableFeatures from "models/user-features";
import ToggleFeaturesList from "components/ui/ToggleFeaturesList";

export default function ProfileEditForm({
  onSubmit,
  fieldErrors,
  setFieldErrors,
  disabled,
  formData,
  setFormData,
  texts,
  inputRefs,
  textButton,
  showUsernameAndEmail,
  showFeatures,
}) {
  const handleChange = useCallback(
    (e) => {
      const { name, value } = e.target;

      const newFormData = { ...formData };
      newFormData[name] = value;
      setFormData(newFormData);
      setFieldErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    },
    [setFormData, setFieldErrors],
  );

  const handleFeaturesChange = useCallback(
    (feature) => {
      const currentFeatures = formData.features || [];
      const newFeatures = currentFeatures.includes(feature)
        ? currentFeatures.filter((f) => f !== feature)
        : [...currentFeatures, feature];

      setFormData({
        ...formData,
        features: newFeatures,
      });
    },
    [formData, setFormData],
  );

  const featuresList = Array.from(availableFeatures).map((feature) => ({
    id: feature,
    name: feature,
    selected: (formData.features || []).includes(feature),
  }));

  return (
    <div className="w-full space-y-4">
      {showUsernameAndEmail && (
        <>
          <div>
            <label htmlFor="username" className="sr-only">
              {texts.label.username}
            </label>
            <input
              ref={inputRefs.username}
              id="username"
              name="username"
              type="text"
              className={`appearance-none relative block w-full px-3 py-2 border ${
                fieldErrors.username ? "border-red-300" : "border-gray-300"
              } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed`}
              placeholder={texts.placeholder.username}
              value={formData.username}
              onChange={handleChange}
              disabled={disabled}
            />
            {fieldErrors.username && (
              <p className="mt-1 text-sm text-red-600">
                {fieldErrors.username}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="sr-only">
              {texts.label.email}
            </label>
            <input
              ref={inputRefs.email}
              id="email"
              name="email"
              type="email"
              className={`appearance-none relative block w-full px-3 py-2 border ${
                fieldErrors.email ? "border-red-300" : "border-gray-300"
              } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed`}
              placeholder={texts.placeholder.email}
              value={formData.email}
              onChange={handleChange}
              disabled={disabled}
            />
            {fieldErrors.email && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
            )}
          </div>
        </>
      )}

      {showFeatures && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {texts.label.features}
          </label>
          <ToggleFeaturesList
            features={featuresList}
            onChange={handleFeaturesChange}
            disabled={disabled}
          />
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={disabled}
          onClick={onSubmit}
          className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {textButton}
        </button>
      </div>
    </div>
  );
}
