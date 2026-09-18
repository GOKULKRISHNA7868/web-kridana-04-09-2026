const CLOUD_NAME = "dr0svrhu1";
const UPLOAD_PRESET = "kirdana";

export async function uploadToCloudinary(file, resourceType = "image") {
  const data = new FormData();
  data.append("file", file);
  data.append("upload_preset", UPLOAD_PRESET);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`,
    { method: "POST", body: data },
  );
  if (!res.ok) throw new Error("Upload failed");
  const json = await res.json();
  return json.secure_url;
}
