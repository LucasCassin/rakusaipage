import { ExclamationCircleIcon } from "@heroicons/react/24/outline";
import InitialLoading from "components/InitialLoading";
import Button from "components/ui/Button";

export default function ErrorPage({
  title,
  message,
  buttons = [],
  icon: Icon = ExclamationCircleIcon,
  iconColor = "text-red-500",
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <InitialLoading />
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <Icon className={`h-24 w-24 ${iconColor}`} />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {title}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">{message}</p>
        </div>

        <div className="mt-8 space-y-4">
          {buttons.map((button, index) => (
            <Button
              key={index}
              variant={button.variant}
              onClick={button.onClick}
              className="w-full"
            >
              {button.text}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
