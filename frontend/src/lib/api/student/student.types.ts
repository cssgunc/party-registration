import {
  LocationDto,
  LocationDtoBackend,
  convertLocation,
} from "../location/location.types";

type ContactPreference = "call" | "text";

type StudentData = {
  contact_preference: ContactPreference;
  last_registered: Date | null;
  phone_number: string;
};

type StudentDataWithNames = StudentData & {
  first_name: string;
  last_name: string;
  residence_place_id?: string | null;
};

type StudentDto = {
  id: number;
  pid: string;
  email: string;
  first_name: string;
  last_name: string;
  onyen: string;
  phone_number: string;
  contact_preference: ContactPreference;
  last_registered: Date | null;
  residence: ResidenceDto | null;
};

type ResidenceDto = {
  location: LocationDto;
  residence_chosen_date: Date;
};

type ResidenceDtoBackend = {
  location: LocationDtoBackend;
  residence_chosen_date: string;
};

type StudentDtoBackend = Omit<StudentDto, "last_registered" | "residence"> & {
  last_registered: string | null;
  residence: ResidenceDtoBackend | null;
};

type ResidenceUpdateDto = {
  residence_place_id: string;
};

function convertStudent(backend: StudentDtoBackend): StudentDto {
  return {
    ...backend,
    last_registered: backend.last_registered
      ? new Date(backend.last_registered)
      : null,
    residence: backend.residence
      ? {
          location: convertLocation(backend.residence.location),
          residence_chosen_date: new Date(
            backend.residence.residence_chosen_date
          ),
        }
      : null,
  };
}

type StudentCreate = {
  account_id: number;
  data: StudentDataWithNames;
};

type IsRegisteredUpdate = {
  is_registered: boolean;
};

export type {
  ContactPreference,
  IsRegisteredUpdate,
  ResidenceDto,
  ResidenceUpdateDto,
  StudentCreate,
  StudentData,
  StudentDataWithNames,
  StudentDto,
  StudentDtoBackend,
};

export { convertStudent };
