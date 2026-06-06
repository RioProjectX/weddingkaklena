/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface StoryEvent {
  id: string;
  year: string;
  title: string;
  description: string;
}

export interface InvitationData {
  id: string;
  groomName: string;
  groomNick: string;
  groomParents: string;
  groomPhoto: string;
  groomBio: string;
  brideName: string;
  brideNick: string;
  brideParents: string;
  bridePhoto: string;
  brideBio: string;
  holyMatrimonyDate: string;
  holyMatrimonyTime: string;
  holyMatrimonyVenue: string;
  holyMatrimonyAddress: string;
  holyMatrimonyMap: string;
  receptionDate: string;
  receptionTime: string;
  receptionVenue: string;
  receptionAddress: string;
  receptionMap: string;
  giftBankName: string;
  giftBankAccount: string;
  giftBankHolder: string;
  giftBankName2?: string;
  giftBankAccount2?: string;
  giftBankHolder2?: string;
  giftAddress: string;
  giftRecipient: string;
  musicUrl: string;
  musicTitle: string;
  storiesJson: string; // Array of StoryEvent as JSON
  galleryJson?: string; // Array of image URLs as JSON
  coverPhoto: string;
  coverBackgroundPhoto?: string;
  mainBackgroundPhoto?: string;
  groomInstagram?: string;
  brideInstagram?: string;
  adminPassword?: string;
  bibleVerse?: string;
  bibleReference?: string;
  thankYouMessage?: string;
  updatedAt: string;
}

export interface GuestWish {
  id: string;
  name: string;
  wish: string;
  status: 'Hadir' | 'Tidak Hadir' | 'Ragu-ragu';
  createdAt: {
    seconds: number;
    nanoseconds: number;
  } | any;
}
