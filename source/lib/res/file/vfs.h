// virtual file system - transparent access to files in archives;
// allows multiple mount points
// this is the public interface.
//
// Copyright (c) 2004 Jan Wassenberg
//
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License as
// published by the Free Software Foundation; either version 2 of the
// License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful, but
// WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
// General Public License for more details.
//
// Contact info:
//   Jan.Wassenberg@stud.uni-karlsruhe.de
//   http://www.stud.uni-karlsruhe.de/~urkt/

/*

[KEEP IN SYNC WITH WIKI!]

Introduction
------------

The VFS (Virtual File System) is a layer between the application and
file.cpp's API. Its main purpose is to decrease the cost of file access;
also provided for are "hotloading" and "modding" via overriding files
(explained below).
The interface is almost identical to that of file.cpp, except that
it works with Handles for safety (see h_mgr.h).


File Access Cost
----------------

Games typically encompass thousands of files. Such heavy loads expose
2 problems with current file systems:
- wasted disk space. An average of half a cluster (>= 1 sector, typically
  512 bytes) is lost per file due to internal fragmentation.
- lengthy file open times. Permissions checks and overhead added by
  antivirus scanners combine to make these slow. Additionally, files are
  typically not arranged in order of access, which induces costly
  disk seeks.

The solution is to put all files in archives: internal fragmentation is
eliminated since they are packed end-to-end; open is much faster;
seeks are avoided by arranging in order of access. For more information,
see 'Archive Details' below.

Note that a good file system (Reiser3 comes close) could also deliver the
above. However, this code is available now on all platforms; there is
no disadvantage to using it and the other features remain.


Hotloading
----------

During development, artists and programmers typically follow a edit/
see how it looks in-game/repeat methodology. Unfortunately, changes to a
file are not immediately noticed by the game; the usual workaround is to
restart the map (or worse, entire game) to make sure they are reloaded.
Since decreases in edit cycle time improve productivity, we want changes to
files to be picked up immediately. To that end, we support hotloading -
as soon as the OS reports changes, all Handle objects that ensued from that
file are reloaded.

The VFS's part in this is registering "watches" that report changes to
any mounted real directory. Since the file notification backend
(currently SGI FAM and a Win32 port) cannot watch an entire directory tree,
we need to do so for every single directory. The VFS traverses each and
stores information anyway, so we do that here.


Modding
-------

1) Motivation

When users tweak game parameters or even create an entirely new game
principle with the same underlying engine, it is called modding.
As evidenced by the Counterstrike mod for Half-Life, this can greatly
prolong the life of a game. Additionally, since we started out as a
mod group, great value is placed on giving users all the tools to make
modding easy.

2) Means

The actual method of overriding game data is quite simple: a mod directory
is mounted into the file system with a higher priority than original data.
These files therefore temporarily (as long as the mod is active) replace the
originals. This allows multiple (non-overlapping!) mods to be active at the
same time and also makes switching between them easy.
The same mechanism is also used for patches to game data.

3) Rationale

Older games did not provide any support for modding other than
directly editing game data. Obviously this is risky and insufficient.
Requiring mods to provide a entire new copy of all game logic/scripts
would obviate support from the file system, but is too much work for the
modder (since all files would first have to be copied somewhere).
Allowing overriding individual files is much safer (since game data is
never touched) and easier (more fine-grained control for modders).

Alternatives to the patch archive approach would be to completely replace
the game data archive (infeasible due to size) or apply a binary patch
(complicated and brittle WRT versioning). We are therefore happy to
use the already existing mod mechanism.

Note however that multiple patches do impact performance (despite
constant-time VFS path -> file location lookup) simply due to locality;
files are no longer arranged in order of access. Fortunately there is an
easy way to avoid this: simply run the archive builder script; all
patched files will be merged into the archive.


For more information, see 'Mount Details' below.


Mount Details
-------------

"Mounting" is understood to mean populating a given VFS directory (the
"mount point") with the contents of e.g. a real directory or archive
(the "mounted object" - for a list of supported types, see enum MountType).

It is important to note that the VFS is a full-fledged tree storing
information about each file, e.g. its last-modified time or actual location.
The advantage is that file open time does not increase with the number of
mounts, which is important because multiple patches and mods may be active.
This is in contrast to e.g. PhysicsFS, which just maintains a list of
mountings and scans it when opening each file.

Each file object in the VFS tree stores its current location; there is no
way to access files of the same name but lower priority residing in other
mounted objects. For this reason, the entire VFS must be rebuilt (i.e.
repopulating all mount points) when a mounting is removed. Fortunately
this is rare and does not happen in-game; we optimize for the common case.


Archive Details
---------------

1) Rationale

An open format (.zip) was chosen instead of a proprietary solution for the
following reasons:
- interoperability: anyone can view or add files without the need for
  special tools, which is important for modding.
- less work: freely available decompression code (ZLib) eases implementation.
Disadvantages are efficiency (only adequate; an in-house format would offer
more potential for optimization) and lacking protection of data files.
Interoperability is a double-edged sword, since anyone can change critical
files or use game assets. However, obfuscating archive contents doesn't
solve anything, because the application needs to access them and a cracker
need only reverse-engineer that. Regardless, the application can call its
archives e.g. ".pk3" (as does Quake III) for minimal protection.

2) Archive Builder

Arranging archive contents in order of access was mentioned above. To that
end, the VFS can log all file open calls into a text file (one per line).
This is then processed by an archive builder script, which needs to
collect all files by VFS lookup rules, then add them to the archive in
the order specified in that file (all remaining files that weren't triggered
in the logging test run should be added thereafter).

Note that the script need only be a simple frontend for e.g. infozip, and
that a plain user-created archive will work as well (advantage of using Zip);
this is just an optimization.

3) Misc. Notes

To ease development, files may additionally be stored in normal directories.
The VFS transparently provides access to the correct (newest) version.

One additional advantage of archives over loose files is that I/O throughput
is increased - since files are compressed, there is less to read from disk.
Decompression is free because it is done in parallel with IOs.

*/

#ifndef __VFS_H__
#define __VFS_H__

#include "../handle.h"	// Handle def
#include "lib/posix.h"	// struct stat
#include "file.h"		// file open flags

// make the VFS tree ready for use. must be called before all other
// functions below unless explicitly mentioned to be allowed.
extern void vfs_init();
extern void vfs_shutdown(void);

// enable/disable logging each file open event - used by the archive builder.
// this should only be done when necessary for performance reasons and is
// typically triggered via command line param. safe to call before vfs_init.
extern void vfs_enable_file_listing(bool want_enabled);

// write a representation of the VFS tree to stdout.
extern void vfs_display(void);


//
// paths
//

// the VFS doesn't require this length restriction - VFS internal storage
// is not fixed-length. the purpose here is to give an indication of how
// large fixed-size user buffers should be. length includes trailing '\0'.
#define VFS_MAX_PATH 256

// convenience function
extern void vfs_path_copy(char* dst, const char* src);

// combine <path1> and <path2> into one path, and write to <dst>.
// if necessary, a directory separator is added between the paths.
// each may be empty, filenames, or full paths.
// total path length (including '\0') must not exceed VFS_MAX_PATH.
extern int vfs_path_append(char* dst, const char* path1, const char* path2);

// VFS paths are of the form: "(dir/)*file?"
// in English: '/' as path separator; trailing '/' required for dir names;
// no leading '/', since "" is the root dir.


//
// mount
//

enum VfsMountFlags
{
	// the directory being mounted (but not its subdirs! see impl) will be
	// searched for archives, and their contents added.
	// use only if necessary, since this is slow (we need to check if
	// each file is an archive, which entails reading the header).
	VFS_MOUNT_ARCHIVES = 1,

	// when mounting a directory, all directories beneath it are
	// added recursively as well.
	VFS_MOUNT_RECURSIVE = 2,

	// all real directories mounted during this operation will be watched
	// for changes. this flag is provided to avoid watches in output-only
	// directories, e.g. screenshots/ (only causes unnecessary overhead).
	VFS_MOUNT_WATCH = 4
};

// mount <P_real_dir> into the VFS at <V_mount_point>,
//   which is created if it does not yet exist.
// files in that directory override the previous VFS contents if
//   <pri>(ority) is not lower.
// all archives in <P_real_dir> are also mounted, in alphabetical order.
//
// flags determines extra actions to perform; see VfsMountFlags.
//
// P_real_dir = "." or "./" isn't allowed - see implementation for rationale.
extern int vfs_mount(const char* V_mount_point, const char* P_real_dir, int flags = 0, uint pri = 0);

// unmount a previously mounted item, and rebuild the VFS afterwards.
extern int vfs_unmount(const char* name);


//
// directory entry
//

// open the directory for reading its entries via vfs_next_dirent.
// <v_dir> need not end in '/'; we add it if not present.
extern Handle vfs_dir_open(const char* dir);

// close the handle to a directory.
// all DirEnt.name strings are now invalid.
extern int vfs_dir_close(Handle& hd);

// retrieve the next (order is unspecified) dir entry matching <filter>.
// return 0 on success, ERR_DIR_END if no matching entry was found,
// or a negative error code on failure.
// filter values:
// - 0: anything;
// - "/": any subdirectory;
// - "/|<pattern>": any subdirectory, or as below with <pattern>;
// - <pattern>: any file whose name matches; ? and * wildcards are allowed.
//
// note that the directory entries are only scanned once; after the
// end is reached (-> ERR_DIR_END returned), no further entries can
// be retrieved, even if filter changes (which shouldn't happen - see impl).
//
// see also the definition of DirEnt in file.h.
//
// rationale: we do not sort directory entries alphabetically here.
// most callers don't need it and the overhead is considerable
// (we'd have to store all entries in a vector). it is left up to
// higher-level code such as VfsUtil.
extern int vfs_dir_next_ent(Handle hd, DirEnt* ent, const char* filter = 0);


//
// file
//

// return actual path to the specified file:
// "<real_directory>/fn" or "<archive_name>/fn".
extern int vfs_realpath(const char* fn, char* realpath);

// does the specified file exist? return false on error.
// useful because a "file not found" warning is not raised, unlike vfs_stat.
extern bool vfs_exists(const char* fn);

// get file status (size, mtime). output param is zeroed on error.
extern int vfs_stat(const char* fn, struct stat*);

// return the size of an already opened file, or a negative error code.
extern ssize_t vfs_size(Handle hf);

// open the file for synchronous or asynchronous IO. write access is
// requested via FILE_WRITE flag, and is not possible for files in archives.
// flags defined in file.h
extern Handle vfs_open(const char* fn, uint flags = 0);

// close the handle to a file.
extern int vfs_close(Handle& h);


//
// asynchronous I/O
//

// low-level file routines - no caching or alignment.

// begin transferring <size> bytes, starting at <ofs>. get result
// with vfs_wait_read; when no longer needed, free via vfs_discard_io.
extern Handle vfs_start_io(Handle hf, size_t size, void* buf);

// indicates if the given IO has completed.
// return value: 0 if pending, 1 if complete, < 0 on error.
extern int vfs_io_complete(Handle hio);

// wait until the transfer <hio> completes, and return its buffer.
// output parameters are zeroed on error.
extern int vfs_wait_io(Handle hio, void*& p, size_t& size);

// finished with transfer <hio> - free its buffer (returned by vfs_wait_read).
extern int vfs_discard_io(Handle& hio);


//
// synchronous I/O
//

// transfer the next <size> bytes to/from the given file.
// (read or write access was chosen at file-open time).
//
// if non-NULL, <cb> is called for each block transferred, passing <ctx>.
// it returns how much data was actually transferred, or a negative error
// code (in which case we abort the transfer and return that value).
// the callback mechanism is useful for user progress notification or
// processing data while waiting for the next I/O to complete
// (quasi-parallel, without the complexity of threads).
//
// p (value-return) indicates the buffer mode:
// - *p == 0: read into buffer we allocate; set *p.
//   caller should mem_free it when no longer needed.
// - *p != 0: read into or write into the buffer *p.
// - p == 0: only read into temp buffers. useful if the callback
//   is responsible for processing/copying the transferred blocks.
//   since only temp buffers can be added to the cache,
//   this is the preferred read method.
//
// return number of bytes transferred (see above), or a negative error code.
extern ssize_t vfs_io(Handle hf, size_t size, void** p, FileIOCB cb = 0, uintptr_t ctx = 0);


// convenience functions that replace vfs_open / vfs_io / vfs_close:

// load the entire file <fn> into memory; return a memory handle to the
// buffer and its address/size. output parameters are zeroed on failure.
// in addition to the regular file cache, the entire buffer is kept in memory
// if flags & FILE_CACHE.
extern Handle vfs_load(const char* fn, void*& p, size_t& size, uint flags = 0);

extern int vfs_store(const char* fn, void* p, size_t size, uint flags = 0);


//
// memory mapping
//

// useful for files that are too large to be loaded into memory,
// or if only (non-sequential) portions of a file are needed at a time.
//
// this is of course only possible for uncompressed files - compressed files
// would have to be inflated sequentially, which defeats the point of mapping.


// map the entire (uncompressed!) file <hf> into memory. if currently
// already mapped, return the previous mapping (reference-counted).
// output parameters are zeroed on failure.
//
// the mapping will be removed (if still open) when its file is closed.
// however, map/unmap calls should still be paired so that the mapping
// may be removed when no longer needed.
extern int vfs_map(Handle hf, uint flags, void*& p, size_t& size);

// decrement the reference count for the mapping belonging to file <f>.
// fail if there are no references; remove the mapping if the count reaches 0.
//
// the mapping will be removed (if still open) when its file is closed.
// however, map/unmap calls should still be paired so that the mapping
// may be removed when no longer needed.
extern int vfs_unmap(Handle hf);


//
// hotloading
//

extern int vfs_reload(const char* fn);

// this must be called from the main thread? (wdir_watch problem)
extern int vfs_reload_changed_files(void);

#endif	// #ifndef __VFS_H__
