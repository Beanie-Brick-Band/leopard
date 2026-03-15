"use client";

import type { Ref } from "react";
import { useEffect, useImperativeHandle, useState } from "react";
import AwsS3 from "@uppy/aws-s3";
import Uppy from "@uppy/core";
import Dashboard from "@uppy/react/dashboard";

import "@uppy/core/css/style.min.css";
import "@uppy/dashboard/css/style.min.css";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export interface StarterCodeUploaderHandle {
  hasFiles: () => boolean;
  upload: () => Promise<void>;
}

interface StarterCodeUploaderProps {
  getUploadUrl: () => Promise<{ uploadUrl: string; storageKey: string }>;
  onUploadSuccess: (storageKey: string) => void | Promise<void>;
  autoProceed?: boolean;
  ref?: Ref<StarterCodeUploaderHandle>;
}

export function StarterCodeUploader({
  getUploadUrl,
  onUploadSuccess,
  autoProceed = true,
  ref,
}: StarterCodeUploaderProps) {
  const [uppy] = useState(() => {
    const instance = new Uppy({
      restrictions: {
        maxNumberOfFiles: 1,
        maxFileSize: MAX_FILE_SIZE,
        allowedFileTypes: [".zip"],
      },
      autoProceed,
    }).use(AwsS3, {
      shouldUseMultipart: false,
      async getUploadParameters(file) {
        const { uploadUrl, storageKey } = await getUploadUrl();
        file.meta.storageKey = storageKey;
        return {
          method: "PUT",
          url: uploadUrl,
          headers: {
            "Content-Type": file.type || "application/zip",
          },
        };
      },
    });

    return instance;
  });

  useImperativeHandle(ref, () => ({
    hasFiles: () => Object.keys(uppy.getState().files).length > 0,
    upload: () =>
      new Promise<void>((resolve, reject) => {
        uppy.once("complete", () => resolve());
        uppy.once("error", (error: unknown) => {
          reject(error instanceof Error ? error : new Error("Upload failed"));
        });
        void uppy.upload();
      }),
  }));

  useEffect(() => {
    const handler = (file: { meta: Record<string, unknown> } | undefined) => {
      if (file) {
        const storageKey = file.meta.storageKey as string;
        void onUploadSuccess(storageKey);
      }
    };

    uppy.on("upload-success", handler);
    return () => {
      uppy.off("upload-success", handler);
    };
  }, [uppy, onUploadSuccess]);

  return (
    <Dashboard
      uppy={uppy}
      proudlyDisplayPoweredByUppy={false}
      hideUploadButton={!autoProceed}
      hideCancelButton={!autoProceed}
      doneButtonHandler={undefined}
      height={300}
      theme="auto"
      note="ZIP files only, up to 50MB"
    />
  );
}
