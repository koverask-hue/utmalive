"use client";

import MuxPlayer from "@mux/mux-player-react";

export default function Player(props: {
  playbackId: string;
  title: string;
  viewerId: string;
  tokens: { playback: string; thumbnail: string };
}) {
  return (
    <MuxPlayer
      className="player"
      playbackId={props.playbackId}
      tokens={props.tokens}
      streamType="live"
      autoPlay
      accentColor="#7aa2ff"
      metadata={{ video_title: props.title, viewer_user_id: props.viewerId }}
    />
  );
}
