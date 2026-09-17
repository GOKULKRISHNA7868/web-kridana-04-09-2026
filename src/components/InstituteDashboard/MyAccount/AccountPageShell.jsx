import React from "react";

const AccountPageShell = ({ children, wide = false, fill = false }) => {
  return (
    <div
      className={`
        w-full mx-auto flex flex-col min-h-0
        ${
          fill
            ? "h-full max-h-full overflow-hidden"
            : `
              -mt-6 -mb-6 md:mt-0 md:mb-0
              overflow-hidden md:overflow-visible
              h-[calc(100dvh-2.5rem-var(--bottom-navbar-height,64px)-env(safe-area-inset-top,0px))]
              max-h-[calc(100dvh-2.5rem-var(--bottom-navbar-height,64px)-env(safe-area-inset-top,0px))]
              md:h-auto md:max-h-none
            `
        }
        ${wide ? "max-w-none" : "max-w-3xl"}
      `}
    >
      <div
        className={`flex-1 min-h-0 overscroll-contain ${
          fill
            ? "overflow-hidden flex flex-col"
            : "overflow-y-auto overflow-x-hidden md:overflow-visible pt-1 pb-4 md:pt-0 md:pb-0"
        }`}
      >
        {children}
      </div>
    </div>
  );
};

export default AccountPageShell;
