import React from "react";
import { Composition } from "remotion";
import { AbysHubOrderAd } from "./AbysHubOrderAd";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="AbysHubOrderAd"
      component={AbysHubOrderAd}
      durationInFrames={600}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{}}
    />
  );
};
