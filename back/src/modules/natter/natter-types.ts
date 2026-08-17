export type Message = {
  content: string;
  space_id: string;
};

export type MessageView = {
  author: string;
  content: string;
  id: number;
  msg_time: Date;
  space_id: number;
};

export type Space = {
  name: string;
};

export type SpaceView = {
  id: number;
  name: string;
  owner: string;
};